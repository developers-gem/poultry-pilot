import 'dart:convert';

import '../../../core/database/app_database.dart';

/// Device cache for API responses (Drift/SQLite), so screens open offline with the last data loaded.
class CacheStore {
  CacheStore(this._db);

  final AppDatabase _db;

  Future<void> put(String key, Map<String, dynamic> json) => _db.putCache(key, jsonEncode(json));

  Future<({Map<String, dynamic> json, DateTime savedAt})?> get(String key) async {
    final row = await _db.getCache(key);
    if (row == null) return null;
    return (json: (jsonDecode(row.body) as Map).cast<String, dynamic>(), savedAt: row.savedAt);
  }

  Future<void> clear() => _db.clearCache();

  /// Removes entries waiting to be sent; returns the photo copies to delete.
  Future<List<String>> clearOutbox() => _db.clearOutbox();
  Future<String?> setting(String key) => _db.getSetting(key);
  Future<void> putSetting(String key, String value) => _db.putSetting(key, value);
}
