import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/data/models/account_models.dart';
import 'package:poultrypilot_mobile/data/models/dashboard_models.dart';
import 'package:poultrypilot_mobile/data/models/farm_models.dart';

import 'support.dart';

/// The app's models against responses captured from the real API. If the API changes shape, the Node test
/// services/api/src/test/mobile-contract.test.ts fails first and these fixtures are regenerated.
void main() {
  test('login and register responses give tokens and the user', () {
    final login = AuthResponseModel.fromJson(fixture('auth_login'));
    expect(login.user.email, 'asha@example.com');
    expect(login.tokens.accessToken, isNotEmpty);
    expect(login.tokens.refreshToken, isNotEmpty);
    final reg = AuthResponseModel.fromJson(fixture('auth_register'));
    expect(reg.farm?.name, 'Green Valley Poultry');
    expect(reg.farm?.settings.currency, 'INR');
    expect(TokensModel.fromJson(fixture('auth_refresh')).refreshToken, isNotEmpty);
  });

  test('/me maps to the account with its farms and permissions', () {
    final me = AccountModel.fromJson(fixture('me')).toEntity();
    expect(me.user.fullName, 'Asha Verma');
    expect(me.user.phone, '+91 98765 43210');
    expect(me.user.emailVerified, isFalse);
    expect(me.memberships, hasLength(1));
    expect(me.memberships.first.role, 'owner');
    expect(me.memberships.first.can('money.read'), isTrue);
    expect(AccountModel.fromJson(fixture('me_verified')).toEntity().user.emailVerified, isTrue);
  });

  test('farm detail and creation', () {
    final farm = FarmModel.fromJson(fixture('farm')).toEntity();
    expect(farm.currency, 'INR');
    expect(farm.timezone, 'Asia/Kolkata');
    expect(farm.myRole, 'owner');
    expect(FarmModel.fromJson(fixture('farm_created')).toEntity().name, 'Second Farm');
  });

  test('the owner dashboard has every section, including weather risk and money', () {
    final d = DashboardModel.fromJson(fixture('dashboard')).toEntity();
    expect(d.farmName, 'Green Valley Poultry');
    expect(d.currency, 'INR');
    expect(d.production!.birdsAlive, 996);
    expect(d.production!.eggsCollected, 900);
    expect(d.production!.henDayPercent, closeTo(90.27, 0.01));
    expect(d.production!.flocks.single.flockCode, 'L1');
    expect(d.weather!.todayMaxC, 37);
    expect(d.weather!.risks.single, contains('above this farm'));
    expect(d.weatherUnavailable, isNull);
    expect(d.alerts.open, 1);
    expect(d.alerts.latest.single.ruleType, 'weather_risk');
    expect(d.upcoming.first.title, contains('IB spray')); // overdue comes first
    expect(d.upcoming.any((u) => u.title.contains('ND booster')), isTrue);
    expect(d.inventory!.eggsInStock, greaterThan(0));
    expect(d.finance!.cashMinor, 500000);
  });

  test('a worker dashboard has no money section; a new farm is empty with weather unavailable', () {
    final worker = DashboardModel.fromJson(fixture('dashboard_worker')).toEntity();
    expect(worker.finance, isNull);
    expect(worker.production, isNotNull);
    final fresh = DashboardModel.fromJson(fixture('dashboard_new_farm')).toEntity();
    expect(fresh.production!.flocks, isEmpty);
    expect(fresh.production!.henDayPercent, isNull);
    expect(fresh.weather, isNull);
    expect(fresh.weatherUnavailable, contains('location'));
  });

  test('devices and notification preferences', () {
    final sessions = (fixture('sessions')['items'] as List).cast<Map<String, dynamic>>().map((j) => DeviceSessionModel.fromJson(j).toEntity()).toList();
    expect(sessions.where((s) => s.current), hasLength(1));
    expect(sessions.first.deviceName, 'Pixel 7');
    final prefs = NotificationPreferencesModel.fromJson(fixture('notification_preferences')).toEntity();
    expect(prefs.pushEnabled, isTrue);
    expect(prefs.pushMinSeverity, 'warning');
    expect(AccountModel.fromJson(fixture('profile_updated')).toEntity().user.phone, '+91 98765 43210');
  });
}
