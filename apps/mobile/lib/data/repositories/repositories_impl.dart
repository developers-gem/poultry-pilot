import '../../core/device/device_identity.dart';
import '../../core/error/app_exception.dart';
import '../../core/storage/token_store.dart';
import '../../domain/entities/account.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/entities/farm.dart';
import '../../domain/repositories/repositories.dart';
import '../datasources/local/cache_store.dart';
import '../datasources/local/photo_store.dart';
import '../datasources/remote/poultrypilot_api.dart';
import '../models/account_models.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({required this.api, required this.tokens, required this.cache, required this.device, this.photos});

  final PoultryPilotApi api;
  final TokenStore tokens;
  final CacheStore cache;
  final Future<DeviceIdentity> Function() device;
  final PhotoStore? photos;

  static const _meKey = 'me';

  Future<Account> _start(AuthResponseModel r) async {
    await tokens.saveTokens(accessToken: r.tokens.accessToken, refreshToken: r.tokens.refreshToken);
    return reloadAccount();
  }

  /// Only a real "signed out" from the API (401) ends the session. Offline, the account as last loaded opens
  /// the app; any other failure is passed on, so the splash screen can offer a retry instead of signing out.
  @override
  Future<Account?> restoreSession() async {
    if (await tokens.readRefreshToken() == null) return null;
    try {
      return await reloadAccount();
    } on AppException catch (e) {
      if (e.isUnauthenticated) {
        await tokens.clearTokens();
        return null;
      }
      if (e.isNetwork) {
        final cached = await cache.get(_meKey);
        if (cached != null) return AccountModel.fromJson(cached.json).toEntity();
      }
      rethrow;
    }
  }

  @override
  Future<Account> login({required String email, required String password}) async => _start(await api.login(email.trim(), password, await device()));

  @override
  Future<Account> register({required String fullName, required String email, required String password, required String farmName, required String currency, required String timezone}) async {
    final r = await api.register(fullName: fullName.trim(), email: email.trim(), password: password, farmName: farmName.trim(), currency: currency, timezone: timezone, device: await device());
    if (r.farm != null) await tokens.saveSelectedFarm(r.farm!.id);
    return _start(r);
  }

  @override
  Future<void> requestPasswordReset(String email) => api.forgotPassword(email.trim());

  @override
  Future<void> logout() async {
    final refresh = await tokens.readRefreshToken();
    try {
      await api.logout(refresh);
    } on AppException {
      // Signing out on the device must always work, even offline; the server session expires on its own.
    }
    await tokens.clearTokens();
    await tokens.saveSelectedFarm(null);
    await cache.clear();
    // The sync queue is kept: each change is tagged with its user and sent only as that user, so nothing recorded
    // offline is lost when a session ends (sign in again to send it).
  }

  @override
  Future<Account> reloadAccount() async {
    final model = await api.me();
    await cache.put(_meKey, model.toJson());
    return model.toEntity();
  }
}

class FarmRepositoryImpl implements FarmRepository {
  FarmRepositoryImpl({required this.api, required this.tokens});

  final PoultryPilotApi api;
  final TokenStore tokens;

  @override
  Future<String?> selectedFarmId() => tokens.readSelectedFarm();
  @override
  Future<void> selectFarm(String? farmId) => tokens.saveSelectedFarm(farmId);
  @override
  Future<Farm> createFarm({required String name, required String currency, required String timezone}) async => (await api.createFarm(name.trim(), currency, timezone)).toEntity();
  @override
  Future<Farm> getFarm(String farmId) async => (await api.farm(farmId)).toEntity();
}

class DashboardRepositoryImpl implements DashboardRepository {
  DashboardRepositoryImpl({required this.api, required this.cache});

  final PoultryPilotApi api;
  final CacheStore cache;

  @override
  Future<Cached<DashboardSummary>> dashboard(String farmId) async {
    final key = 'dashboard:$farmId';
    try {
      final json = await api.dashboardJson(farmId);
      await cache.put(key, json);
      return Cached(api.parseDashboard(json).toEntity(), fromCache: false, savedAt: DateTime.now());
    } on AppException catch (e) {
      final cached = e.isNetwork ? await cache.get(key) : null;
      if (cached == null) rethrow;
      return Cached(api.parseDashboard(cached.json).toEntity(), fromCache: true, savedAt: cached.savedAt);
    }
  }
}

class ProfileRepositoryImpl implements ProfileRepository {
  ProfileRepositoryImpl({required this.api});

  final PoultryPilotApi api;

  @override
  Future<Account> updateProfile({required String fullName, String? phone}) async => (await api.updateProfile(fullName.trim(), phone?.trim())).toEntity();
  @override
  Future<void> changePassword({required String currentPassword, required String newPassword}) => api.changePassword(currentPassword, newPassword);
  @override
  Future<void> resendVerification() => api.resendVerification();
  @override
  Future<List<DeviceSession>> sessions() async => (await api.sessions()).map((s) => s.toEntity()).toList();
  @override
  Future<void> revokeSession(String sessionId) => api.revokeSession(sessionId);
  @override
  Future<void> revokeOtherSessions() => api.revokeOtherSessions();
}

class SettingsRepositoryImpl implements SettingsRepository {
  SettingsRepositoryImpl({required this.api, required this.cache});

  final PoultryPilotApi api;
  final CacheStore cache;
  static const _onboardingKey = 'onboardingSeen';

  @override
  Future<NotificationPreferences> notificationPreferences() async => (await api.notificationPreferences()).toEntity();
  @override
  Future<NotificationPreferences> saveNotificationPreferences(NotificationPreferences prefs) async => (await api.saveNotificationPreferences(notificationPreferencesRequest(prefs))).toEntity();

  @override
  Future<({int unread, List<InboxNotification> items})> inbox() async {
    final r = await api.inbox();
    return (unread: r.unread, items: r.items.map((i) => i.toEntity()).toList());
  }

  @override
  Future<void> markRead(List<String> ids) => ids.isEmpty ? api.markAllRead() : api.markRead(ids);
  @override
  Future<bool> onboardingSeen() async => (await cache.setting(_onboardingKey)) == 'true';
  @override
  Future<void> markOnboardingSeen() => cache.putSetting(_onboardingKey, 'true');
  @override
  Future<void> clearCache() => cache.clear();
}
