import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/providers.dart';
import 'package:poultrypilot_mobile/domain/entities/account.dart';
import 'package:poultrypilot_mobile/domain/entities/farm.dart';
import 'package:poultrypilot_mobile/domain/repositories/repositories.dart';
import 'package:poultrypilot_mobile/presentation/session/session_controller.dart';

class FakeAuth implements AuthRepository {
  FakeAuth(this.account);
  Account? account;
  @override
  Future<Account?> restoreSession() async => account;
  @override
  Future<Account> login({required String email, required String password}) async => account!;
  @override
  Future<Account> register({required String fullName, required String email, required String password, required String farmName, required String currency, required String timezone}) async => account!;
  @override
  Future<void> requestPasswordReset(String email) async {}
  @override
  Future<void> logout() async => account = null;
  @override
  Future<Account> reloadAccount() async => account!;
}

class FakeFarms implements FarmRepository {
  String? selected;
  @override
  Future<String?> selectedFarmId() async => selected;
  @override
  Future<void> selectFarm(String? farmId) async => selected = farmId;
  @override
  Future<Farm> createFarm({required String name, required String currency, required String timezone}) => throw UnimplementedError();
  @override
  Future<Farm> getFarm(String farmId) => throw UnimplementedError();
}

class FakeSettings implements SettingsRepository {
  bool seen = true;
  @override
  Future<bool> onboardingSeen() async => seen;
  @override
  Future<void> markOnboardingSeen() async => seen = true;
  @override
  Future<NotificationPreferences> notificationPreferences() => throw UnimplementedError();
  @override
  Future<NotificationPreferences> saveNotificationPreferences(NotificationPreferences prefs) => throw UnimplementedError();
  @override
  Future<void> clearCache() async {}
}

void main() {
  const user = User(id: 'u', email: 'a@b.co', fullName: 'Asha', emailVerified: true, hasPassword: true, googleLinked: false);
  const one = Membership(membershipId: 'm1', farmId: 'f1', farmName: 'Green Valley', role: 'owner');
  const two = Membership(membershipId: 'm2', farmId: 'f2', farmName: 'Hill Farm', role: 'worker');

  ProviderContainer container(FakeAuth auth, FakeFarms farms, FakeSettings settings) => ProviderContainer(overrides: [
        authRepositoryProvider.overrideWithValue(auth),
        farmRepositoryProvider.overrideWithValue(farms),
        settingsRepositoryProvider.overrideWithValue(settings),
      ]);

  test('first launch shows onboarding; finishing it continues to sign-in', () async {
    final settings = FakeSettings()..seen = false;
    final c = container(FakeAuth(null), FakeFarms(), settings);
    await c.read(sessionProvider.notifier).start();
    expect(c.read(sessionProvider), isA<SessionOnboarding>());
    await c.read(sessionProvider.notifier).finishOnboarding();
    expect(c.read(sessionProvider), isA<SessionSignedOut>());
  });

  test('a person with one farm goes straight to it', () async {
    final c = container(FakeAuth(const Account(user: user, memberships: [one])), FakeFarms(), FakeSettings());
    await c.read(sessionProvider.notifier).start();
    expect(c.read(sessionProvider).farm?.farmId, 'f1');
  });

  test('with several farms the stored choice is kept, or asked for; a farm left behind is forgotten', () async {
    final farms = FakeFarms()..selected = 'f2';
    final c = container(FakeAuth(const Account(user: user, memberships: [one, two])), farms, FakeSettings());
    await c.read(sessionProvider.notifier).start();
    expect(c.read(sessionProvider).farm?.farmId, 'f2');
    farms.selected = 'gone';
    await c.read(sessionProvider.notifier).start();
    expect(c.read(sessionProvider).farm, isNull);
    expect(farms.selected, isNull);
  });

  test('sign out returns to signed out', () async {
    final c = container(FakeAuth(const Account(user: user, memberships: [one])), FakeFarms(), FakeSettings());
    await c.read(sessionProvider.notifier).start();
    await c.read(sessionProvider.notifier).logout();
    expect(c.read(sessionProvider), isA<SessionSignedOut>());
  });

  test('a session the API will not refresh sends the person back to sign-in', () async {
    final c = container(FakeAuth(const Account(user: user, memberships: [one])), FakeFarms(), FakeSettings());
    await c.read(sessionProvider.notifier).start();
    c.read(sessionExpiredProvider.notifier).state++;
    expect(c.read(sessionProvider), isA<SessionSignedOut>());
  });
}
