import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

/// API responses kept on the device so screens open offline (the dashboard, the account). Keyed by request.
class CachedResponses extends Table {
  TextColumn get cacheKey => text()();
  TextColumn get body => text()();
  DateTimeColumn get savedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {cacheKey};
}

/// Small local settings that are not secrets (onboarding seen, last farm shown).
class LocalSettings extends Table {
  TextColumn get settingKey => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {settingKey};
}

/// Every change made on the phone, in order, until the server has it (the sync queue).
/// Status: pending → syncing → synced; or failed (the server refused it) or conflict (needs the farmer).
/// Rows are never deleted silently: only after syncing (pruned later) or when the farmer discards one.
@DataClassName('SyncOpRow')
class SyncOps extends Table {
  /// The mutation id the server de-duplicates on (a UUID made on the phone).
  TextColumn get id => text()();

  /// Order of creation on this phone.
  IntColumn get seq => integer()();
  TextColumn get userId => text()();
  TextColumn get farmId => text()();
  TextColumn get command => text()();

  /// What the change is about (e.g. day:<flock>:<date>, task:<id>), for ordering and showing it locally.
  TextColumn get entityKey => text()();
  TextColumn get payloadJson => text()();

  /// The record version the farmer saw; null for creations, or "after the previous change to the same thing".
  IntColumn get baseVersion => integer().nullable()();

  /// Made while an earlier change to the same thing was still unsent: its base version is the earlier change's
  /// result, filled in when that one has synced.
  BoolColumn get chained => boolean().withDefault(const Constant(false))();

  /// For day changes: the touched sections as the farmer saw them (to merge safely after a conflict).
  TextColumn get baseSnapshotJson => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get errorCode => text().nullable()();
  TextColumn get lastError => text().nullable()();

  /// The server's answer: the accepted result, or the server's document for a conflict.
  TextColumn get serverJson => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get syncedAt => dateTime().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {id};
}

/// Photos for a queued change: a copy in the app's storage, and the server's asset id once uploaded (so an
/// interrupted upload never sends a photo twice).
@DataClassName('SyncPhotoRow')
class SyncOpPhotos extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get opId => text()();
  TextColumn get filePath => text()();
  TextColumn get assetId => text().nullable()();
}

/// Legacy (schema 2) outbox, kept only so an upgrade can move its entries into the sync queue.
@DataClassName('OutboxEntry')
class PendingEntries extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get farmId => text()();
  TextColumn get flockId => text()();
  TextColumn get date => text()();

  /// The PATCH body without photos (photos are added when they have been uploaded).
  TextColumn get patchJson => text()();

  /// The record version the farmer saw; null when the day did not exist yet.
  IntColumn get baseVersion => integer().nullable()();

  /// waiting, conflict or failed.
  TextColumn get status => text().withDefault(const Constant('waiting'))();
  TextColumn get error => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();
}

/// Photos for a pending entry: a copy in the app's own storage, and the asset id once uploaded.
@DataClassName('OutboxPhoto')
class PendingPhotos extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get entryId => integer()();
  TextColumn get filePath => text()();
  TextColumn get assetId => text().nullable()();
}

@DriftDatabase(tables: [CachedResponses, LocalSettings, PendingEntries, PendingPhotos, SyncOps, SyncOpPhotos])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? driftDatabase(name: 'poultrypilot'));

  @override
  int get schemaVersion => 3;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.createTable(pendingEntries);
            await m.createTable(pendingPhotos);
          }
          if (from < 3) {
            await m.createTable(syncOps);
            await m.createTable(syncOpPhotos);
          }
        },
      );

  Future<void> putCache(String key, String json) => into(cachedResponses).insertOnConflictUpdate(
        CachedResponsesCompanion.insert(cacheKey: key, body: json, savedAt: DateTime.now()),
      );

  Future<CachedResponse?> getCache(String key) => (select(cachedResponses)..where((t) => t.cacheKey.equals(key))).getSingleOrNull();

  Future<int> clearCache() => delete(cachedResponses).go();

  Future<String?> getSetting(String key) async => (await (select(localSettings)..where((t) => t.settingKey.equals(key))).getSingleOrNull())?.value;

  Future<void> putSetting(String key, String value) => into(localSettings).insertOnConflictUpdate(LocalSettingsCompanion.insert(settingKey: key, value: value));
}

/// Moves entries from the schema-2 outbox into the sync queue (once, at start-up), so an upgrade loses nothing.
extension LegacyOutbox on AppDatabase {
  Future<int> migrateLegacyOutbox({required String userId, required Future<int> Function() nextSeq, required String Function() newId}) async {
    final legacy = await select(pendingEntries).get();
    for (final e in legacy) {
      final patch = (jsonDecode(e.patchJson) as Map).cast<String, dynamic>()..remove('version')..remove('photos');
      final id = newId();
      final now = DateTime.now();
      await into(syncOps).insert(SyncOpsCompanion.insert(
        id: id,
        seq: await nextSeq(),
        userId: userId,
        farmId: e.farmId,
        command: 'daily_record.patch',
        entityKey: 'day:${e.flockId}:${e.date}',
        payloadJson: jsonEncode({'flockId': e.flockId, 'date': e.date, 'patch': patch}),
        baseVersion: Value(e.baseVersion),
        createdAt: e.createdAt,
        updatedAt: now,
      ));
      for (final p in await (select(pendingPhotos)..where((t) => t.entryId.equals(e.id))).get()) {
        await into(syncOpPhotos).insert(SyncOpPhotosCompanion.insert(opId: id, filePath: p.filePath, assetId: Value(p.assetId)));
      }
      await (delete(pendingPhotos)..where((t) => t.entryId.equals(e.id))).go();
      await (delete(pendingEntries)..where((t) => t.id.equals(e.id))).go();
    }
    return legacy.length;
  }
}
