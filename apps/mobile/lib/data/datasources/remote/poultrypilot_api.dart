import '../../../core/device/device_identity.dart';
import '../../../core/network/api_client.dart';
import '../../models/account_models.dart';
import '../../models/daily_entry_models.dart';
import '../../models/dashboard_models.dart';
import '../../models/farm_work_models.dart';
import '../../models/sync_models.dart';
import '../../models/farm_models.dart';

/// The REST endpoints the mobile app uses: the same /api/v1 the web app calls. No mobile-only backend.
class PoultryPilotApi {
  PoultryPilotApi(this._client);

  final ApiClient _client;

  // ---- auth (public)
  Future<AuthResponseModel> login(String email, String password, DeviceIdentity device) async =>
      AuthResponseModel.fromJson(await _client.post('/auth/login', data: {'email': email, 'password': password, 'device': device.toJson()}, public: true));

  Future<AuthResponseModel> register({required String fullName, required String email, required String password, required String farmName, required String currency, required String timezone, required DeviceIdentity device}) async =>
      AuthResponseModel.fromJson(await _client.post('/auth/register', public: true, data: {
        'fullName': fullName,
        'email': email,
        'password': password,
        'farm': {'name': farmName, 'currency': currency, 'timezone': timezone},
        'device': device.toJson(),
      }));

  Future<void> forgotPassword(String email) async => _client.post('/auth/forgot-password', data: {'email': email}, public: true);

  Future<void> logout(String? refreshToken) async => _client.post('/auth/logout', data: {if (refreshToken != null) 'refreshToken': refreshToken});

  // ---- account
  Future<AccountModel> me() async => AccountModel.fromJson(await _client.get('/me'));
  Future<AccountModel> updateProfile(String fullName, String? phone) async => AccountModel.fromJson(await _client.put('/me', data: {'fullName': fullName, if (phone != null && phone.isNotEmpty) 'phone': phone}));
  Future<void> changePassword(String current, String next) async => _client.post('/auth/change-password', data: {'currentPassword': current, 'newPassword': next});
  Future<void> resendVerification() async => _client.post('/auth/resend-verification');
  Future<List<DeviceSessionModel>> sessions() async {
    final body = await _client.get('/me/sessions');
    return (body['items'] as List).cast<Map<String, dynamic>>().map(DeviceSessionModel.fromJson).toList();
  }

  Future<void> revokeSession(String id) => _client.delete('/me/sessions/$id');
  Future<void> revokeOtherSessions() => _client.delete('/me/sessions');
  Future<NotificationPreferencesModel> notificationPreferences() async => NotificationPreferencesModel.fromJson(await _client.get('/me/notification-preferences'));
  Future<NotificationPreferencesModel> saveNotificationPreferences(Map<String, dynamic> body) async => NotificationPreferencesModel.fromJson(await _client.put('/me/notification-preferences', data: body));

  // ---- notifications
  Future<PushDeviceModel> registerPushDevice({required String platform, required String token, String? deviceName}) async =>
      PushDeviceModel.fromJson(await _client.post('/me/push-devices', data: {'platform': platform, 'token': token, if (deviceName != null) 'deviceName': deviceName}));
  Future<void> removePushDevice(String id) => _client.delete('/me/push-devices/$id');
  Future<({int unread, List<InboxItemModel> items})> inbox({bool unreadOnly = false}) async {
    final body = await _client.get('/me/notifications', query: {if (unreadOnly) 'unreadOnly': 'true'});
    return (unread: (body['unread'] as num? ?? 0).toInt(), items: ((body['items'] as List?) ?? const []).cast<Map<String, dynamic>>().map(InboxItemModel.fromJson).toList());
  }

  Future<void> markRead(List<String> ids) async => _client.post('/me/notifications/read', data: {'ids': ids});
  Future<void> markAllRead() async => _client.post('/me/notifications/read-all');

  // ---- farms
  Future<FarmModel> createFarm(String name, String currency, String timezone) async => FarmModel.fromJson(await _client.post('/farms', data: {'name': name, 'currency': currency, 'timezone': timezone}));
  Future<FarmModel> farm(String farmId) async => FarmModel.fromJson(await _client.get('/farms/$farmId'));

  /// Raw JSON, so the repository can cache exactly what the API sent.
  Future<Map<String, dynamic>> dashboardJson(String farmId) => _client.get('/farms/$farmId/dashboard');

  DashboardModel parseDashboard(Map<String, dynamic> json) => DashboardModel.fromJson(json);

  // ---- daily entry
  Future<Map<String, dynamic>> sheetJson(String farmId, String? date) => _client.get('/farms/$farmId/daily-records/sheet', query: {if (date != null) 'date': date});
  Future<Map<String, dynamic>> dayJson(String farmId, String flockId, String date) => _client.get('/farms/$farmId/flocks/$flockId/daily-records/$date');
  Future<DayRecordModel> patchDay(String farmId, String flockId, String date, Map<String, dynamic> body) async => DayRecordModel.fromJson(await _client.patch('/farms/$farmId/flocks/$flockId/daily-records/$date', data: body));
  Future<List<FeedStockItemModel>> feedStock(String farmId) async {
    final body = await _client.get('/farms/$farmId/feed/stock');
    return ((body['items'] as List?) ?? const []).cast<Map<String, dynamic>>().map(FeedStockItemModel.fromJson).toList();
  }

  Future<MediaModel> uploadPhoto(String farmId, List<int> bytes, String contentType) async => MediaModel.fromJson(await _client.postBytes('/farms/$farmId/media', bytes, contentType));

  // ---- tasks
  /// Raw JSON (cached as the API sent it).
  Future<Map<String, dynamic>> todayJson(String farmId) => _client.get('/farms/$farmId/tasks/today');
  Future<List<TaskModel>> tasks(String farmId, {String status = 'active', String assignee = 'any'}) async {
    final body = await _client.get('/farms/$farmId/tasks', query: {'status': status, 'assignee': assignee});
    return (body['items'] as List).cast<Map<String, dynamic>>().map(TaskModel.fromJson).toList();
  }

  Future<TaskModel> createTask(String farmId, Map<String, dynamic> body) async => TaskModel.fromJson(await _client.post('/farms/$farmId/tasks', data: body));
  Future<TaskModel> completeTask(String farmId, String id, String? notes) async => TaskModel.fromJson(await _client.post('/farms/$farmId/tasks/$id/complete', data: {if (notes != null && notes.isNotEmpty) 'notes': notes}));
  Future<TaskModel> startTask(String farmId, String id) async => TaskModel.fromJson(await _client.post('/farms/$farmId/tasks/$id/start'));

  // ---- flocks, production, health
  Future<Map<String, dynamic>> flocksJson(String farmId) => _client.get('/farms/$farmId/flocks', query: {'status': 'active'});
  Future<List<HouseModel>> houses(String farmId) async => ((await _client.get('/farms/$farmId/houses'))['items'] as List).cast<Map<String, dynamic>>().map(HouseModel.fromJson).toList();
  Future<FlockModel> flock(String farmId, String flockId) async => FlockModel.fromJson(await _client.get('/farms/$farmId/flocks/$flockId'));
  Future<List<WeighInModel>> weighIns(String farmId, String flockId) async => ((await _client.get('/farms/$farmId/flocks/$flockId/weighings'))['items'] as List).cast<Map<String, dynamic>>().map(WeighInModel.fromJson).toList();
  Future<Map<String, dynamic>> trendsJson(String farmId, String from, String to, String? flockId) => _client.get('/farms/$farmId/dashboard/trends', query: {'from': from, 'to': to, if (flockId != null) 'flockId': flockId});
  Future<List<HealthRecordModel>> healthRecords(String farmId) async => ((await _client.get('/farms/$farmId/health/records'))['items'] as List).cast<Map<String, dynamic>>().map(HealthRecordModel.fromJson).toList();
  Future<List<VaccinationModel>> vaccinations(String farmId) async => ((await _client.get('/farms/$farmId/health/vaccinations'))['items'] as List).cast<Map<String, dynamic>>().map(VaccinationModel.fromJson).toList();
  Future<void> createHealthRecord(String farmId, Map<String, dynamic> body) async => _client.post('/farms/$farmId/health/records', data: body);
  Future<void> administerVaccination(String farmId, String id, Map<String, dynamic> body) async => _client.post('/farms/$farmId/health/vaccinations/$id/administer', data: body);

  // ---- offline sync
  /// POST /sync/push: the queued changes, in order. The server applies each once (by mutation id).
  Future<List<SyncResultModel>> push(String farmId, String deviceId, List<Map<String, dynamic>> mutations) async {
    final body = await _client.post('/sync/push', data: {'farmId': farmId, 'deviceId': deviceId, 'mutations': mutations});
    return ((body['results'] as List?) ?? const []).cast<Map<String, dynamic>>().map(SyncResultModel.fromJson).toList();
  }

  // ---- raw JSON reads (cached on the phone exactly as the API sent them)
  Future<List<dynamic>> tasksJson(String farmId, {String status = 'active', String assignee = 'any'}) async => ((await _client.get('/farms/$farmId/tasks', query: {'status': status, 'assignee': assignee}))['items'] as List?) ?? const [];
  Future<Map<String, dynamic>> housesJson(String farmId) => _client.get('/farms/$farmId/houses');
  Future<Map<String, dynamic>> flockJson(String farmId, String flockId) => _client.get('/farms/$farmId/flocks/$flockId');
  Future<Map<String, dynamic>> weighInsJson(String farmId, String flockId) => _client.get('/farms/$farmId/flocks/$flockId/weighings');
  Future<Map<String, dynamic>> healthRecordsJson(String farmId) => _client.get('/farms/$farmId/health/records');
  Future<Map<String, dynamic>> vaccinationsJson(String farmId) => _client.get('/farms/$farmId/health/vaccinations');
}
