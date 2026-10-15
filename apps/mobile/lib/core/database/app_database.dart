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

/// Daily entries saved while offline, sent when the connection returns (the outbox).
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

@DriftDatabase(tables: [CachedResponses, LocalSettings, PendingEntries, PendingPhotos])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? driftDatabase(name: 'poultrypilot'));

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) => m.createAll(),
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.createTable(pendingEntries);
            await m.createTable(pendingPhotos);
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

/// Outbox queries.
extension Outbox on AppDatabase {
  Future<int> addPending({required String farmId, required String flockId, required String date, required String patchJson, int? baseVersion}) => into(pendingEntries).insert(
        PendingEntriesCompanion.insert(farmId: farmId, flockId: flockId, date: date, patchJson: patchJson, baseVersion: Value(baseVersion), createdAt: DateTime.now()),
      );

  Future<void> addPendingPhoto(int entryId, String filePath) => into(pendingPhotos).insert(PendingPhotosCompanion.insert(entryId: entryId, filePath: filePath));

  Future<List<OutboxEntry>> pendingFor({String? farmId, String? status}) {
    final q = select(pendingEntries)..orderBy([(t) => OrderingTerm.asc(t.id)]);
    if (farmId != null) q.where((t) => t.farmId.equals(farmId));
    if (status != null) q.where((t) => t.status.equals(status));
    return q.get();
  }

  Future<List<OutboxPhoto>> photosFor(int entryId) => (select(pendingPhotos)..where((t) => t.entryId.equals(entryId))).get();

  Future<void> markPhotoUploaded(int photoId, String assetId) => (update(pendingPhotos)..where((t) => t.id.equals(photoId))).write(PendingPhotosCompanion(assetId: Value(assetId)));

  Future<void> setPendingStatus(int id, String status, {String? error, int? baseVersion, bool setBase = false}) => (update(pendingEntries)..where((t) => t.id.equals(id))).write(
        PendingEntriesCompanion(status: Value(status), error: Value(error), baseVersion: setBase ? Value(baseVersion) : const Value.absent()),
      );

  /// Everything waiting on this phone (on sign-out: entries must not be sent later as someone else).
  Future<List<String>> clearOutbox() async {
    final files = (await select(pendingPhotos).get()).map((p) => p.filePath).toList();
    await delete(pendingPhotos).go();
    await delete(pendingEntries).go();
    return files;
  }

  Future<void> removePending(int id) async {
    await (delete(pendingPhotos)..where((t) => t.entryId.equals(id))).go();
    await (delete(pendingEntries)..where((t) => t.id.equals(id))).go();
  }
}
