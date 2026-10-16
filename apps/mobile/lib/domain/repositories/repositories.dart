import '../entities/account.dart';
import '../entities/daily_entry.dart';
import '../entities/farm_work.dart';
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

  /// The in-app notifications (unread count and newest first).
  Future<({int unread, List<InboxNotification> items})> inbox();

  /// Marks these as read; an empty list marks all.
  Future<void> markRead(List<String> ids);
  Future<bool> onboardingSeen();
  Future<void> markOnboardingSeen();
  Future<void> clearCache();
}

/// Saving always writes to the phone first; the sync queue sends it. [queued] = waiting for the connection.
enum SaveOutcome { saved, queued }

abstract class DailyEntryRepository {
  /// [date] null = today in the farm's time zone. Flocks with unsent changes are marked pendingSync.
  Future<Cached<DailySheet>> sheet(String farmId, String? date);

  /// The day from the server (or the phone's copy), with the farmer's unsent changes applied on top.
  Future<Cached<DayRecord>> day(String farmId, String flockId, String date);
  Future<List<FeedOption>> feedOptions(String farmId);

  /// Queues the touched sections (and copies of the photos) for the server.
  Future<SaveOutcome> save({required String userId, required String farmId, required DayDraft draft, List<String> photoPaths});
}

abstract class FarmWorkRepository {
  Future<TodayWork> today(String farmId, {required String userId});
  Future<List<TaskItem>> tasks(String farmId, {required String userId, String status = 'active', String assignee = 'any'});
  Future<TaskItem> createTask(String farmId, {required String title, String? dueDate, String priority = 'normal', String? flockId});

  /// Queued (works offline); the task shows as done straight away.
  Future<void> completeTask(String farmId, String taskId, {required String userId, String? notes});
  Future<Cached<List<FlockSummary>>> flocks(String farmId);
  Future<List<HouseItem>> houses(String farmId);
  Future<FlockDetail> flock(String farmId, String flockId);
  Future<List<WeighIn>> weighIns(String farmId, String flockId);
  Future<Cached<List<TrendDay>>> trends(String farmId, {required String from, required String to, String? flockId});
  Future<List<HealthRecordItem>> healthRecords(String farmId, {required String userId});
  Future<List<VaccinationItem>> vaccinations(String farmId, {required String userId});

  /// Queued (works offline), with an id made on the phone so the record is created once.
  Future<void> reportProblem(String farmId, {required String userId, required String flockId, required String date, required String title, required List<String> symptoms, int? affectedBirds});
  Future<void> markVaccinated(String farmId, String vaccinationId, {required String userId, required String date, int? birds});
}
