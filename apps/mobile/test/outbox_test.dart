import 'dart:convert';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/database/app_database.dart';
import 'package:poultrypilot_mobile/core/network/api_client.dart';
import 'package:poultrypilot_mobile/core/storage/token_store.dart';
import 'package:poultrypilot_mobile/data/datasources/local/cache_store.dart';
import 'package:poultrypilot_mobile/data/datasources/local/photo_store.dart';
import 'package:poultrypilot_mobile/data/datasources/remote/poultrypilot_api.dart';
import 'package:poultrypilot_mobile/data/repositories/farm_work_repositories.dart';
import 'package:poultrypilot_mobile/domain/repositories/repositories.dart';

import 'support.dart';

class MemoryPhotos implements PhotoStore {
  final Map<String, List<int>> files = {'/camera/a.jpg': [0xff, 0xd8, 1, 2], '/camera/b.jpg': [0xff, 0xd8, 3, 4]};
  @override
  Future<String> keep(String sourcePath) async {
    final path = '/kept/${files.length}.jpg';
    files[path] = files[sourcePath]!;
    return path;
  }

  @override
  Future<List<int>> read(String path) async => files[path]!;
  @override
  Future<void> delete(String path) async => files.remove(path);
}

/// A scripted API: the day as the server holds it, and every write recorded.
class FakeServer {
  bool online = true;
  Map<String, dynamic> day = fixture('daily_record_day');
  final patches = <Map<String, dynamic>>[];
  int uploads = 0;

  Future<FakeReply> handle(dynamic o) async {
    if (!online) return const FakeReply.offline();
    final path = o.path as String;
    if (path.endsWith('/media')) {
      uploads++;
      return FakeReply(201, {'id': 'asset-$uploads', 'url': '/m/$uploads', 'contentType': 'image/jpeg'});
    }
    if (o.method == 'PATCH') {
      final body = (o.data is String ? jsonDecode(o.data as String) : o.data) as Map<String, dynamic>;
      if (body['version'] != day['version']) return const FakeReply(409, {'error': {'code': 'VERSION_CONFLICT', 'message': 'changed'}});
      patches.add(body);
      day = {...day, 'version': (day['version'] as int) + 1};
      return FakeReply(200, day);
    }
    return FakeReply(200, day);
  }
}

void main() {
  late FakeServer server;
  late AppDatabase db;
  late MemoryPhotos photos;
  late DailyEntryRepositoryImpl repo;

  setUp(() {
    server = FakeServer();
    db = AppDatabase(NativeDatabase.memory());
    photos = MemoryPhotos();
    final api = PoultryPilotApi(ApiClient(store: MemoryTokenStore()..accessToken = 'a', onSessionExpired: () {}, baseUrl: 'http://api.test', adapter: FakeAdapter((o) => server.handle(o))));
    repo = DailyEntryRepositoryImpl(api: api, cache: CacheStore(db), db: db, photos: photos);
  });
  tearDown(() => db.close());

  test('online: photos are uploaded first, then one PATCH carries them with the touched sections', () async {
    final outcome = await repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'eggs': {'collected': 900, 'broken': 5}, 'version': 1}, photoPaths: ['/camera/a.jpg']);
    expect(outcome, SaveOutcome.saved);
    expect(server.uploads, 1);
    expect(server.patches.single, {'eggs': {'collected': 900, 'broken': 5}, 'version': 1, 'photos': [{'assetId': 'asset-1'}]});
  });

  test('offline: the entry and a copy of its photos wait on the phone, then go when back online', () async {
    server.online = false;
    final outcome = await repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'waterLitres': 200, 'version': 1}, photoPaths: ['/camera/a.jpg', '/camera/b.jpg']);
    expect(outcome, SaveOutcome.queued);
    expect((await repo.pending('f')).single.sections, ['waterLitres']);
    expect((await repo.pending('f')).single.photoCount, 2);
    expect(await repo.sync(), 1); // still offline: nothing sent, nothing lost
    server.online = true;
    expect(await repo.sync(), 0);
    expect(server.uploads, 2);
    expect(server.patches.single['waterLitres'], 200);
    expect(server.patches.single['photos'], [{'assetId': 'asset-1'}, {'assetId': 'asset-2'}]);
    expect(photos.files.keys.where((k) => k.startsWith('/kept/')), isEmpty); // copies removed after sending
  });

  test('a day changed elsewhere while offline is held for the farmer, then sent or dropped as they choose', () async {
    server.online = false;
    await repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'eggs': {'collected': 1, 'broken': 0}, 'version': 1});
    server.online = true;
    server.day = {...server.day, 'version': 2}; // someone else saved meanwhile
    expect(await repo.sync(), 1);
    final held = (await repo.pending('f')).single;
    expect(held.status, 'conflict');
    expect(server.patches, isEmpty); // nothing overwritten
    await repo.resolveConflict(held.id, sendAnyway: true);
    expect(server.patches.single['version'], 2);
    expect(await repo.pending('f'), isEmpty);
  });

  test('discarding a held entry removes it and its photos', () async {
    server.online = false;
    await repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'waterLitres': 1, 'version': 1}, photoPaths: ['/camera/a.jpg']);
    server.online = true;
    server.day = {...server.day, 'version': 5};
    await repo.sync();
    await repo.resolveConflict((await repo.pending('f')).single.id, sendAnyway: false);
    expect(await repo.pending('f'), isEmpty);
    expect(photos.files.keys.where((k) => k.startsWith('/kept/')), isEmpty);
  });

  test('a version conflict while online goes back to the screen (not queued)', () async {
    server.day = {...server.day, 'version': 3};
    await expectLater(repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'waterLitres': 1, 'version': 1}), throwsA(anything));
    expect(await repo.pending('f'), isEmpty);
  });

  test('signing out clears everything waiting (never sent later as someone else)', () async {
    server.online = false;
    await repo.save(farmId: 'f', flockId: 'l1', date: '2026-10-14', patch: {'waterLitres': 1, 'version': 1}, photoPaths: ['/camera/a.jpg']);
    final files = await CacheStore(db).clearOutbox();
    expect(files, hasLength(1));
    expect(await repo.pending('f'), isEmpty);
  });
}
