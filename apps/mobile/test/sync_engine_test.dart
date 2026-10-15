import 'package:drift/drift.dart' show Value;
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/database/app_database.dart';
import 'package:poultrypilot_mobile/core/network/api_client.dart';
import 'package:poultrypilot_mobile/core/storage/token_store.dart';
import 'package:poultrypilot_mobile/core/sync/day_merge.dart';
import 'package:poultrypilot_mobile/data/datasources/remote/poultrypilot_api.dart';
import 'package:poultrypilot_mobile/data/models/daily_entry_models.dart';
import 'package:poultrypilot_mobile/data/sync/sync_engine.dart';
import 'package:poultrypilot_mobile/data/sync/sync_queue.dart';

import 'support.dart';
import 'sync_support.dart';

/// Interrupted synchronization: whatever fails and wherever, a change recorded offline is applied exactly once,
/// never lost, and never silently overwrites someone else's work.
void main() {
  late FakeSyncServer server;
  late AppDatabase db;
  late SyncQueue queue;
  late MemoryPhotos photos;
  late MemoryTokenStore tokens;
  late ApiClient client;
  late int expired;

  SyncEngine engine() => SyncEngine(api: PoultryPilotApi(client), queue: queue, photos: photos, tokens: tokens, interceptor: client.interceptor, deviceId: () async => 'phone-1');

  setUp(() {
    server = FakeSyncServer();
    db = AppDatabase(NativeDatabase.memory());
    queue = SyncQueue(db);
    photos = MemoryPhotos();
    tokens = MemoryTokenStore()
      ..accessToken = 'access'
      ..refreshToken = 'refresh';
    expired = 0;
    client = ApiClient(store: tokens, onSessionExpired: () => expired++, baseUrl: 'http://api.test', adapter: FakeAdapter(server.handle));
  });
  tearDown(() => db.close());

  final base = DayRecordModel.fromJson(fixture('daily_record_day')).toEntity(); // version 1

  Future<SyncOp> queueDay(Map<String, dynamic> patch, {String user = 'u1', int? baseVersion = 1, List<String> photoFiles = const []}) => queue.enqueue(
        userId: user,
        farmId: 'f1',
        command: 'daily_record.patch',
        entityKey: 'day:l1:2026-10-14',
        payload: {'flockId': 'l1', 'date': '2026-10-14', 'patch': patch},
        baseVersion: baseVersion,
        baseSnapshot: {...snapshotOf(base, patch.keys), '_photos': <String>[]},
        photoFiles: photoFiles,
      );

  Future<SyncOp> queueDeaths(int n, {String user = 'u1'}) => queue.enqueue(userId: user, farmId: 'f1', command: 'flock.mortality', entityKey: 'deaths:$n', payload: {'flockId': 'l1', 'date': '2026-10-14', 'count': n, 'cause': 'unknown'});

  Future<String> statusOf(String id) async => (await queue.byId(id))!.status;

  test('recorded offline: kept as pending, sent when the connection returns', () async {
    server.online = false;
    final op = await queueDay({'waterLitres': 220});
    final r1 = await engine().run(userId: 'u1');
    expect(r1.outcome, SyncOutcome.offline);
    expect(await statusOf(op.id), OpStatus.pending);
    server.online = true;
    final r2 = await engine().run(userId: 'u1');
    expect(r2.outcome, SyncOutcome.synced);
    expect(await statusOf(op.id), OpStatus.synced);
    expect(server.days['l1:2026-10-14']!['waterLitres'], 220);
  });

  test('response lost after the server applied it: resent, the stored result comes back, applied once', () async {
    final op = await queueDay({'waterLitres': 230});
    server.dropResponses = 1;
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.offline);
    expect(await statusOf(op.id), OpStatus.pending); // the phone does not know it arrived
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(await statusOf(op.id), OpStatus.synced);
    expect(server.applied[op.id], 1);
    expect(server.pushRequests, 2);
  });

  test('app closed mid-sync: changes left "syncing" are recovered and sent once', () async {
    final op = await queueDeaths(3);
    await queue.markMany([op.id], OpStatus.syncing); // the app died with the request in flight
    final fresh = engine(); // a new start of the app
    expect((await fresh.run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(await statusOf(op.id), OpStatus.synced);
    expect(server.deaths, 3);
  });

  test('server fails part-way through a batch: retrying applies every change exactly once', () async {
    final ops = [await queueDeaths(1), await queueDeaths(2), await queueDeaths(3)];
    server.crashAfter = 1;
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.failed);
    for (final o in ops) {
      expect(await statusOf(o.id), OpStatus.pending);
    }
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(server.deaths, 6); // 1 + 2 + 3, nothing twice
    expect(server.applied.values, everyElement(1));
  });

  test('photo upload interrupted: the photo already uploaded is not sent again', () async {
    final op = await queueDay({'waterLitres': 240}, photoFiles: [await photos.keep('/camera/a.jpg'), await photos.keep('/camera/b.jpg')]);
    server.failUploadNumber = 2;
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.offline);
    final saved = (await queue.byId(op.id))!.photos;
    expect(saved.where((p) => p.assetId != null), hasLength(1));
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(server.uploads, 3); // 1 ok, 1 failed, 1 retried: the first was not re-uploaded
    expect((server.days['l1:2026-10-14']!['photos'] as List).map((p) => (p as Map)['assetId']), ['asset-1', 'asset-3']);
    expect(photos.files.keys.where((k) => k.startsWith('/kept/')), isEmpty); // copies removed once synced
  });

  test('session refused: sync stops with "sign in", and every change is kept', () async {
    final op = await queueDay({'waterLitres': 250});
    tokens.accessToken = null;
    server.refuseRefresh = true;
    final r = await engine().run(userId: 'u1');
    expect(r.outcome, SyncOutcome.needsSignIn);
    expect(await statusOf(op.id), OpStatus.pending);
    expect(server.pushRequests, 0);
  });

  test('session expires during the push: the batch goes back to pending, nothing lost', () async {
    final op = await queueDeaths(2);
    server.sessionExpired = true;
    server.refuseRefresh = true;
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.needsSignIn);
    expect(await statusOf(op.id), OpStatus.pending);
    expect(expired, 1);
    expect(server.deaths, 0);
  });

  test('conflict, different sections: merged automatically onto the server version', () async {
    final op = await queueDay({'waterLitres': 260});
    server.days['l1:2026-10-14'] = {...server.days['l1:2026-10-14']!, 'eggs': {'collected': 999, 'broken': 1}, 'version': 2}; // someone saved the eggs
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(await statusOf(op.id), OpStatus.synced);
    final day = server.days['l1:2026-10-14']!;
    expect(day['waterLitres'], 260);
    expect((day['eggs'] as Map)['collected'], 999); // their eggs kept
  });

  test('conflict, same section: held for the farmer; "keep mine" sends it on the server version', () async {
    final op = await queueDay({'waterLitres': 270});
    server.days['l1:2026-10-14'] = {...server.days['l1:2026-10-14']!, 'waterLitres': 150, 'version': 2};
    final e = engine();
    final r = await e.run(userId: 'u1');
    expect(r.conflicts, 1);
    expect(await statusOf(op.id), OpStatus.conflict);
    expect(server.days['l1:2026-10-14']!['waterLitres'], 150); // nothing overwritten
    await e.keepMine(op.id);
    expect((await e.run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(server.days['l1:2026-10-14']!['waterLitres'], 270);
  });

  test('conflict, same section: "use the server\'s" removes only that change, when the farmer chooses', () async {
    final op = await queueDay({'waterLitres': 280});
    server.days['l1:2026-10-14'] = {...server.days['l1:2026-10-14']!, 'waterLitres': 150, 'version': 2};
    final e = engine();
    await e.run(userId: 'u1');
    expect(await statusOf(op.id), OpStatus.conflict);
    await e.discard(op.id);
    expect(await queue.byId(op.id), isNull);
    expect(server.days['l1:2026-10-14']!['waterLitres'], 150);
  });

  test('refused changes are kept (failed) and block later changes to the same thing until retried', () async {
    final bad = await queue.enqueue(userId: 'u1', farmId: 'f1', command: 'test.refused', entityKey: 'thing:1', payload: {'x': 1});
    final after = await queue.enqueue(userId: 'u1', farmId: 'f1', command: 'test.refused', entityKey: 'thing:1', payload: {'x': 2});
    final e = engine();
    final r = await e.run(userId: 'u1');
    expect(r.failed, 1);
    expect((await queue.byId(bad.id))!.row.lastError, contains('Not allowed'));
    expect(await statusOf(after.id), OpStatus.pending); // not sent out of order
    await e.retry(bad.id);
    expect(await statusOf(bad.id), OpStatus.pending);
  });

  test("another account's changes on this phone are never sent as the current person", () async {
    final theirs = await queueDeaths(5, user: 'u2');
    final mine = await queueDeaths(1);
    await engine().run(userId: 'u1');
    expect(await statusOf(mine.id), OpStatus.synced);
    expect(await statusOf(theirs.id), OpStatus.pending);
    expect(server.deaths, 1);
  });

  test('a second change made while the first is being sent waits, then goes on the version the first produced', () async {
    final first = await queueDay({'waterLitres': 290});
    await queue.markMany([first.id], OpStatus.syncing); // in flight
    final second = await queueDay({'eggs': {'collected': 870, 'broken': 3}}, baseVersion: 1);
    expect(second.id, isNot(first.id));
    expect(second.row.chained, isTrue);
    await queue.recoverInterrupted();
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
    expect(await statusOf(second.id), OpStatus.synced);
    final day = server.days['l1:2026-10-14']!;
    expect(day['waterLitres'], 290);
    expect((day['eggs'] as Map)['collected'], 870);
    expect(day['version'], 3);
  });

  test('two changes to the same day before syncing are merged into one (later values win)', () async {
    final a = await queueDay({'waterLitres': 300});
    final b = await queueDay({'eggs': {'collected': 880, 'broken': 2}, 'waterLitres': 310});
    expect(b.id, a.id);
    expect((b.payload['patch'] as Map), {'waterLitres': 310, 'eggs': {'collected': 880, 'broken': 2}});
    expect(b.snapshot.keys, containsAll(['waterLitres', 'eggs']));
  });

  test('entries from the old outbox (before this version) are moved into the queue, not lost', () async {
    await db.into(db.pendingEntries).insert(PendingEntriesCompanion.insert(farmId: 'f1', flockId: 'l1', date: '2026-10-14', patchJson: '{"waterLitres": 205, "version": 1}', baseVersion: const Value(1), createdAt: DateTime.now()));
    final moved = await db.migrateLegacyOutbox(userId: 'u1', nextSeq: queue.nextSeqForMigration, newId: () => '01a20000-0000-4000-8000-000000000123');
    expect(moved, 1);
    final ops = await queue.list(userId: 'u1');
    expect(ops.single.payload['patch'], {'waterLitres': 205}); // version moved out of the patch
    expect(ops.single.row.baseVersion, 1);
    expect(await db.select(db.pendingEntries).get(), isEmpty);
    expect((await engine().run(userId: 'u1')).outcome, SyncOutcome.synced);
  });
}
