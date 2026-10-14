import '../../../core/device/device_identity.dart';
import '../../../core/network/api_client.dart';
import '../../models/account_models.dart';
import '../../models/dashboard_models.dart';
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
  Future<NotificationPreferencesModel> saveNotificationPreferences(NotificationPreferencesModel p) async => NotificationPreferencesModel.fromJson(await _client.put('/me/notification-preferences', data: p.toJson()));

  // ---- farms
  Future<FarmModel> createFarm(String name, String currency, String timezone) async => FarmModel.fromJson(await _client.post('/farms', data: {'name': name, 'currency': currency, 'timezone': timezone}));
  Future<FarmModel> farm(String farmId) async => FarmModel.fromJson(await _client.get('/farms/$farmId'));

  /// Raw JSON, so the repository can cache exactly what the API sent.
  Future<Map<String, dynamic>> dashboardJson(String farmId) => _client.get('/farms/$farmId/dashboard');

  DashboardModel parseDashboard(Map<String, dynamic> json) => DashboardModel.fromJson(json);
}
