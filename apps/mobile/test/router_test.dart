import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/router/app_router.dart';
import 'package:poultrypilot_mobile/domain/entities/account.dart';
import 'package:poultrypilot_mobile/presentation/session/session_controller.dart';

void main() {
  const user = User(id: 'u', email: 'a@b.co', fullName: 'Asha', emailVerified: true, hasPassword: true, googleLinked: false);
  const farm = Membership(membershipId: 'm', farmId: 'f1', farmName: 'Green Valley', role: 'owner');
  const account = Account(user: user, memberships: [farm]);

  test('starting and failed start stay on the splash', () {
    expect(sessionRedirect(const SessionState.starting(), Routes.home), Routes.splash);
    expect(sessionRedirect(const SessionState.starting(), Routes.splash), isNull);
    expect(sessionRedirect(const SessionState.startFailed('x'), Routes.login), Routes.splash);
  });

  test('first launch goes to onboarding', () {
    expect(sessionRedirect(const SessionState.onboarding(), Routes.splash), Routes.onboarding);
  });

  test('signed out: only the sign-in screens', () {
    const s = SessionState.signedOut();
    expect(sessionRedirect(s, Routes.home), Routes.login);
    expect(sessionRedirect(s, Routes.signup), isNull);
    expect(sessionRedirect(s, Routes.forgotPassword), isNull);
  });

  test('signed in without a farm: farm selection', () {
    const s = SessionState.signedIn(account: account);
    expect(sessionRedirect(s, Routes.home), Routes.farms);
    expect(sessionRedirect(s, Routes.farms), isNull);
  });

  test('signed in with a farm: the app, never the sign-in screens', () {
    const s = SessionState.signedIn(account: account, farmId: 'f1');
    expect(sessionRedirect(s, Routes.login), Routes.home);
    expect(sessionRedirect(s, Routes.splash), Routes.home);
    expect(sessionRedirect(s, Routes.profile), isNull);
    expect(sessionRedirect(s, Routes.farms), isNull); // switching farms
  });

  test('a stored farm the person no longer belongs to counts as no farm', () {
    expect(const SessionState.signedIn(account: account, farmId: 'gone').farm, isNull);
    expect(sessionRedirect(const SessionState.signedIn(account: account, farmId: 'gone'), Routes.home), Routes.farms);
  });
}
