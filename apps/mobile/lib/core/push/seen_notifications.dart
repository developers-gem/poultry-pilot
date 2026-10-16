import 'dart:convert';

import '../../data/datasources/local/cache_store.dart';

/// The notifications already shown on this phone (by the API's notification id), so the same notification is
/// never shown twice: not when FCM delivers it again, nor after the person tapped it in the system tray.
class SeenNotifications {
  SeenNotifications(this.cache, {this.capacity = 200});

  final CacheStore cache;
  final int capacity;
  static const _key = 'seenNotifications';
  List<String>? _ids;
  Future<void> _last = Future.value();

  Future<List<String>> _load() async {
    final cached = _ids;
    if (cached != null) return cached;
    final raw = await cache.setting(_key);
    return _ids = raw == null ? <String>[] : (jsonDecode(raw) as List).cast<String>();
  }

  /// True the first time an id is seen (then remembered); false for a repeat. Calls are handled one at a time.
  Future<bool> firstTime(String id) {
    final result = _last.then((_) async {
      final ids = await _load();
      if (ids.contains(id)) return false;
      ids.add(id);
      if (ids.length > capacity) ids.removeRange(0, ids.length - capacity);
      await cache.putSetting(_key, jsonEncode(ids));
      return true;
    });
    _last = result.then((_) {}, onError: (_) {});
    return result;
  }
}
