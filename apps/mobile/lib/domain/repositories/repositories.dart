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
  Future<bool> onboardingSeen();
  Future<void> markOnboardingSeen();
  Future<void> clearCache();
}

/// The result of saving a day: sent to the API, or kept on the phone until the connection returns.
enum SaveOutcome { saved, queued }

abstract class DailyEntryRepository {
  /// [date] null = today in the farm's time zone.
  Future<Cached<DailySheet>> sheet(String farmId, String? date);
  Future<Cached<DayRecord>> day(String farmId, String flockId, String date);
  Future<List<FeedOption>> feedOptions(String farmId);

  /// Uploads [photoPaths] and saves [patch] for the day. Offline, both wait on the phone (outbox).
  Future<SaveOutcome> save({required String farmId, required String flockId, required String date, required Map<String, dynamic> patch, List<String> photoPaths});

  /// Sends what waited offline. Returns how many entries are still waiting (including conflicts).
  Future<int> sync();

  /// Entries waiting on this phone, oldest first.
  Future<List<PendingEntry>> pending(String farmId);

  /// A queued entry whose day changed elsewhere: send it on top of the latest version, or drop it.
  Future<void> resolveConflict(int id, {required bool sendAnyway});
}

class PendingEntry {
  const PendingEntry({required this.id, required this.flockId, required this.date, required this.sections, required this.photoCount, required this.status, this.error});

  final int id;
  final String flockId;
  final String date;
  final List<String> sections;
  final int photoCount;

  /// waiting, conflict or failed.
  final String status;
  final String? error;
}

abstract class FarmWorkRepository {
  Future<TodayWork> today(String farmId);
  Future<List<TaskItem>> tasks(String farmId, {String status = 'active', String assignee = 'any'});
  Future<TaskItem> createTask(String farmId, {required String title, String? dueDate, String priority = 'normal', String? flockId});
  Future<TaskItem> completeTask(String farmId, String taskId, {String? notes});
  Future<TaskItem> startTask(String farmId, String taskId);
  Future<Cached<List<FlockSummary>>> flocks(String farmId);
  Future<List<HouseItem>> houses(String farmId);
  Future<FlockDetail> flock(String farmId, String flockId);
  Future<List<WeighIn>> weighIns(String farmId, String flockId);
  Future<Cached<List<TrendDay>>> trends(String farmId, {required String from, required String to, String? flockId});
  Future<List<HealthRecordItem>> healthRecords(String farmId);
  Future<List<VaccinationItem>> vaccinations(String farmId);
  Future<void> reportProblem(String farmId, {required String flockId, required String date, required String title, required List<String> symptoms, int? affectedBirds});
  Future<void> markVaccinated(String farmId, String vaccinationId, {required String date, int? birds});
}
