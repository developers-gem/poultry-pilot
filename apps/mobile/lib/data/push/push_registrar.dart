import 'dart:convert';

import '../../core/push/push_messaging.dart';
import '../datasources/local/cache_store.dart';

/// Registers this phone's push token with the API for the signed-in person, once per person and token, and removes
/// it on sign-out. The API moves a token to whoever registers it, so one phone never notifies two accounts.
class PushRegistrar {
  PushRegistrar({required this.messaging, required this.cache, required this.registerDevice, required this.removeDevice, required this.platform, this.deviceName});

  final PushMessaging messaging;
  final CacheStore cache;

  /// POST /me/push-devices; returns the device id.
  final Future<String> Function({required String platform, required String token, String? deviceName}) registerDevice;

  /// DELETE /me/push-devices/:id.
  final Future<void> Function(String deviceId) removeDevice;
  final String platform;
  final String? deviceName;

  static const _key = 'push.device';

  Future<({String userId, String deviceId, String token})?> registered() async {
    final raw = await cache.setting(_key);
    if (raw == null || raw.isEmpty) return null;
    final m = (jsonDecode(raw) as Map).cast<String, dynamic>();
    return (userId: m['userId'] as String, deviceId: m['deviceId'] as String, token: m['token'] as String);
  }

  /// Asks permission and registers the token. Returns the permission (granted means push will arrive).
  Future<PushPermission> enable(String userId) async {
    final permission = await messaging.requestPermission();
    if (permission != PushPermission.granted) return permission;
    final token = await messaging.token();
    if (token != null) await ensureRegistered(userId, token);
    return permission;
  }

  /// Registers [token] for [userId] unless it already is (no repeated registrations on every start).
  Future<bool> ensureRegistered(String userId, String token) async {
    final current = await registered();
    if (current != null && current.userId == userId && current.token == token) return false;
    final id = await registerDevice(platform: platform, token: token, deviceName: deviceName);
    await cache.putSetting(_key, jsonEncode({'userId': userId, 'deviceId': id, 'token': token}));
    return true;
  }

  /// On sign-out: the server stops pushing to this phone for this person, and the local token is replaced.
  Future<void> disable() async {
    final current = await registered();
    if (current != null) {
      try {
        await removeDevice(current.deviceId);
      } catch (_) {
        // Offline: the token is deleted below, so pushes to it fail and the server disables it.
      }
    }
    await cache.putSetting(_key, '');
    try {
      await messaging.deleteToken();
    } catch (_) {}
  }
}
