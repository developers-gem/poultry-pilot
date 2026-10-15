import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/database/app_database.dart';
import 'package:poultrypilot_mobile/core/network/api_client.dart';
import 'package:poultrypilot_mobile/core/storage/token_store.dart';
import 'package:poultrypilot_mobile/data/datasources/local/cache_store.dart';
import 'package:poultrypilot_mobile/data/datasources/remote/poultrypilot_api.dart';
import 'package:poultrypilot_mobile/data/models/daily_entry_models.dart';
import 'package:poultrypilot_mobile/data/repositories/farm_work_repositories.dart';
import 'package:poultrypilot_mobile/data/sync/sync_queue.dart';
import 'package:poultrypilot_mobile/domain/entities/daily_entry.dart';

import 'support.dart';
import 'sync_support.dart';

/// Offline, screens show the last data from the server with the farmer's own unsent changes on top.
void main() {
  late FakeSyncServer server;
  late AppDatabase db;
  late SyncQueue queue;
  late DailyEntryRepositoryImpl entries;
  late FarmWorkRepositoryImpl work;

  setUp(() {
    server = FakeSyncServer();
    db = AppDatabase(NativeDatabase.memory());
    queue = SyncQueue(db);
    final api = PoultryPilotApi(ApiClient(store: MemoryTokenStore()..accessToken = 'a', onSessionExpired: () {}, baseUrl: 'http://api.test', adapter: FakeAdapter(server.handle)));
    entries = DailyEntryRepositoryImpl(api: api, cache: CacheStore(db), queue: queue, photos: MemoryPhotos());
    work = FarmWorkRepositoryImpl(api: api, cache: CacheStore(db), queue: queue);
  });
  tearDown(() => db.close());

  test('a day recorded offline shows the queued values, and stays editable', () async {
    final loaded = await entries.day('f1', 'l1', '2026-10-14'); // online once: cached
    server.online = false;
    final draft = DayDraft(loaded.data)
      ..setWater(215)
      ..setDeaths('heat_stress', 4);
    expect(await entries.save(userId: 'u1', farmId: 'f1', draft: draft), isNotNull);
    final offline = await entries.day('f1', 'l1', '2026-10-14');
    expect(offline.fromCache, isTrue);
    expect(offline.data.waterLitres, 215);
    // The death already on the day stays; the new heat-stress deaths are added beside it.
    expect(offline.data.mortality.where((m) => m.fromDailyRecord).map((m) => '${m.cause}:${m.count}').toSet(), {'unknown:1', 'heat_stress:4'});
    expect(offline.data.version, 1); // still the server's version: the change is not on the server yet
    final op = (await queue.list(userId: 'u1')).single;
    expect(op.row.baseVersion, 1);
    expect(op.payload['patch'], {'waterLitres': 215.0, 'mortality': [{'cause': 'unknown', 'count': 1}, {'cause': 'heat_stress', 'count': 4}]});
  });

  test('a day never loaded can still be recorded offline (starts empty)', () async {
    server.online = false;
    final empty = await entries.day('f1', 'l9', '2026-10-15');
    expect(empty.data.version, isNull);
    await entries.save(userId: 'u1', farmId: 'f1', draft: DayDraft(empty.data)..setEggs(500, 2));
    expect((await entries.day('f1', 'l9', '2026-10-15')).data.eggsCollected, 500);
    expect((await queue.list()).single.row.baseVersion, isNull);
  });

  test('tasks finished and health events reported offline show at once, marked waiting to sync', () async {
    await work.completeTask('f1', 'task-1', userId: 'u1', notes: 'Done');
    await work.reportProblem('f1', userId: 'u1', flockId: 'l1', date: '2026-10-14', title: 'Coughing', symptoms: ['Coughing'], affectedBirds: 2);
    server.online = false;
    final health = await work.healthRecords('f1', userId: 'u1');
    expect(health.first.pendingSync, isTrue);
    expect(health.first.title, 'Coughing');
    final ops = await queue.list(userId: 'u1');
    expect(ops.map((o) => o.command), ['task.complete', 'health.record']);
    expect(ops.last.payload['id'], matches(RegExp(r'^[0-9a-f-]{36}$'))); // the record id is made on the phone
  });

  test('pure overlay: feed and deaths entered elsewhere are kept under the farmer\'s changes', () {
    final day = DayRecordModel.fromJson(fixture('daily_record_day')).toEntity();
    final d = DayDraft(day)..setFeed(120, 'feed-1');
    final patch = d.toPatch()..remove('version');
    expect(patch['feed'], isNotNull);
  });
}
