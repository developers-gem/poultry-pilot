import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../core/providers.dart';
import '../../domain/entities/account.dart';

part 'session_controller.freezed.dart';

/// Where the app stands: still starting, needs onboarding, signed out, or signed in (with the chosen farm).
@freezed
sealed class SessionState with _$SessionState {
  const SessionState._();

  const factory SessionState.starting() = SessionStarting;
  const factory SessionState.startFailed(Object error) = SessionStartFailed;
  const factory SessionState.onboarding() = SessionOnboarding;
  const factory SessionState.signedOut() = SessionSignedOut;
  const factory SessionState.signedIn({required Account account, String? farmId}) = SessionSignedIn;

  /// The selected farm's membership, if the person is signed in and has chosen one they belong to.
  Membership? get farm => switch (this) {
        SessionSignedIn(:final account, :final farmId) => account.memberships.where((m) => m.farmId == farmId).firstOrNull,
        _ => null,
      };
}

/// The app's session (global view model). Screens call its methods; the router follows its state.
class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() {
    // The HTTP layer reports a session that can no longer be refreshed: go back to sign-in.
    ref.listen<int>(sessionExpiredProvider, (_, __) {
      if (state is SessionSignedIn) state = const SessionState.signedOut();
    });
    return const SessionState.starting();
  }

  /// Splash: onboarding once, then restore the stored session (works offline with the cached account).
  Future<void> start() async {
    state = const SessionState.starting();
    try {
      if (!await ref.read(settingsRepositoryProvider).onboardingSeen()) {
        state = const SessionState.onboarding();
        return;
      }
      final account = await ref.read(authRepositoryProvider).restoreSession();
      state = account == null ? const SessionState.signedOut() : await _signedIn(account);
    } catch (e) {
      state = SessionState.startFailed(e);
    }
  }

  Future<void> finishOnboarding() async {
    await ref.read(settingsRepositoryProvider).markOnboardingSeen();
    await start();
  }

  Future<void> login(String email, String password) async => state = await _signedIn(await ref.read(authRepositoryProvider).login(email: email, password: password));

  Future<void> register({required String fullName, required String email, required String password, required String farmName, required String currency, required String timezone}) async {
    final account = await ref.read(authRepositoryProvider).register(fullName: fullName, email: email, password: password, farmName: farmName, currency: currency, timezone: timezone);
    state = await _signedIn(account);
  }

  Future<void> selectFarm(String farmId) async {
    final s = state;
    if (s is! SessionSignedIn) return;
    await ref.read(farmRepositoryProvider).selectFarm(farmId);
    state = SessionState.signedIn(account: s.account, farmId: farmId);
  }

  /// Back to the farm list (to switch farms).
  Future<void> clearFarm() async {
    final s = state;
    if (s is! SessionSignedIn) return;
    await ref.read(farmRepositoryProvider).selectFarm(null);
    state = SessionState.signedIn(account: s.account);
  }

  /// After the account changes (profile saved, farm created): reload from the API, keeping the farm if still valid.
  Future<void> reloadAccount({String? selectFarm}) async {
    final account = await ref.read(authRepositoryProvider).reloadAccount();
    if (selectFarm != null) await ref.read(farmRepositoryProvider).selectFarm(selectFarm);
    state = await _signedIn(account);
  }

  void updateAccount(Account account) {
    final s = state;
    if (s is SessionSignedIn) state = SessionState.signedIn(account: account, farmId: s.farmId);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const SessionState.signedOut();
  }

  /// A stored farm is kept only if the person still belongs to it; with exactly one farm it is chosen for them.
  Future<SessionState> _signedIn(Account account) async {
    final farms = ref.read(farmRepositoryProvider);
    var farmId = await farms.selectedFarmId();
    if (farmId != null && !account.memberships.any((m) => m.farmId == farmId)) farmId = null;
    if (farmId == null && account.memberships.length == 1) farmId = account.memberships.first.farmId;
    await farms.selectFarm(farmId);
    return SessionState.signedIn(account: account, farmId: farmId);
  }
}

final sessionProvider = NotifierProvider<SessionController, SessionState>(SessionController.new);
