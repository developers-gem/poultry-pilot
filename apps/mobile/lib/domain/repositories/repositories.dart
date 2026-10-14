import '../entities/account.dart';
import '../entities/dashboard.dart';
import '../entities/farm.dart';

/// Sign-in, sign-up and the session. Implementations talk to the PoultryPilot API (/api/v1/auth, /me).
abstract class AuthRepository {
  /// Restores a session from the stored refresh token; null if there is none or it is no longer valid.
  Future<Account?> restoreSession();
  Future<Account> login({required String email, required String password});
  Future<Account> register({required String fullName, required String email, required String password, required String farmName, required String currency, required String timezone});
  Future<void> requestPasswordReset(String email);
  Future<void> logout();
  Future<Account> reloadAccount();
}

abstract class FarmRepository {
  Future<String?> selectedFarmId();
  Future<void> selectFarm(String? farmId);
  Future<Farm> createFarm({required String name, required String currency, required String timezone});
  Future<Farm> getFarm(String farmId);
}

abstract class DashboardRepository {
  /// The farm's dashboard: from the API when reachable (and cached), otherwise from the device's cache.
  Future<Cached<DashboardSummary>> dashboard(String farmId);
}

abstract class ProfileRepository {
  Future<Account> updateProfile({required String fullName, String? phone});
  Future<void> changePassword({required String currentPassword, required String newPassword});
  Future<void> resendVerification();
  Future<List<DeviceSession>> sessions();
  Future<void> revokeSession(String sessionId);
  Future<void> revokeOtherSessions();
}

abstract class SettingsRepository {
  Future<NotificationPreferences> notificationPreferences();
  Future<NotificationPreferences> saveNotificationPreferences(NotificationPreferences prefs);
  Future<bool> onboardingSeen();
  Future<void> markOnboardingSeen();
  Future<void> clearCache();
}
