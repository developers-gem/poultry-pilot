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

@DriftDatabase(tables: [CachedResponses, LocalSettings])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? driftDatabase(name: 'poultrypilot'));

  @override
  int get schemaVersion => 1;

  Future<void> putCache(String key, String json) => into(cachedResponses).insertOnConflictUpdate(
        CachedResponsesCompanion.insert(cacheKey: key, body: json, savedAt: DateTime.now()),
      );

  Future<CachedResponse?> getCache(String key) => (select(cachedResponses)..where((t) => t.cacheKey.equals(key))).getSingleOrNull();

  Future<int> clearCache() => delete(cachedResponses).go();

  Future<String?> getSetting(String key) async => (await (select(localSettings)..where((t) => t.settingKey.equals(key))).getSingleOrNull())?.value;

  Future<void> putSetting(String key, String value) => into(localSettings).insertOnConflictUpdate(LocalSettingsCompanion.insert(settingKey: key, value: value));
}
