import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the session lives on the device.
///  - The access token (15 minutes) is kept in memory only.
///  - The refresh token is kept in the platform's secure storage (Android Keystore, iOS Keychain).
///  - The chosen farm and this install's device id sit there too.
abstract class TokenStore {
  String? get accessToken;
  set accessToken(String? value);
  Future<String?> readRefreshToken();
  Future<void> saveTokens({required String accessToken, required String refreshToken});
  Future<void> clearTokens();
  Future<String?> readSelectedFarm();
  Future<void> saveSelectedFarm(String? farmId);
  Future<String?> readDeviceId();
  Future<void> saveDeviceId(String id);
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
            );

  final FlutterSecureStorage _storage;
  static const _refreshKey = 'pp.refreshToken';
  static const _farmKey = 'pp.selectedFarm';
  static const _deviceKey = 'pp.deviceId';

  @override
  String? accessToken;

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _refreshKey);

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    this.accessToken = accessToken;
    await _storage.write(key: _refreshKey, value: refreshToken);
  }

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    await _storage.delete(key: _refreshKey);
  }

  @override
  Future<String?> readSelectedFarm() => _storage.read(key: _farmKey);

  @override
  Future<void> saveSelectedFarm(String? farmId) => farmId == null ? _storage.delete(key: _farmKey) : _storage.write(key: _farmKey, value: farmId);

  @override
  Future<String?> readDeviceId() => _storage.read(key: _deviceKey);

  @override
  Future<void> saveDeviceId(String id) => _storage.write(key: _deviceKey, value: id);
}

/// In-memory store for tests.
class MemoryTokenStore implements TokenStore {
  @override
  String? accessToken;
  String? refreshToken;
  String? farm;
  String? device;

  @override
  Future<String?> readRefreshToken() async => refreshToken;
  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  @override
  Future<void> clearTokens() async {
    accessToken = null;
    refreshToken = null;
  }

  @override
  Future<String?> readSelectedFarm() async => farm;
  @override
  Future<void> saveSelectedFarm(String? farmId) async => farm = farmId;
  @override
  Future<String?> readDeviceId() async => device;
  @override
  Future<void> saveDeviceId(String id) async => device = id;
}
