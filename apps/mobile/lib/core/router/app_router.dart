import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/auth/forgot_password_screen.dart';
import '../../presentation/auth/login_screen.dart';
import '../../presentation/auth/signup_screen.dart';
import '../../presentation/dashboard/dashboard_screen.dart';
import '../../presentation/farms/farm_selection_screen.dart';
import '../../presentation/onboarding/onboarding_screen.dart';
import '../../presentation/profile/profile_screen.dart';
import '../../presentation/session/session_controller.dart';
import '../../presentation/settings/settings_screen.dart';
import '../../presentation/shell/home_shell.dart';
import '../../presentation/splash/splash_screen.dart';

class Routes {
  const Routes._();
  static const splash = '/splash';
  static const onboarding = '/onboarding';
  static const login = '/login';
  static const signup = '/signup';
  static const forgotPassword = '/forgot-password';
  static const farms = '/farms';
  static const dashboard = '/dashboard';
  static const profile = '/profile';
  static const settings = '/settings';

  static const auth = {login, signup, forgotPassword};
}

/// Where the app must be for a session state (pure, so it is unit-tested). Null means "stay".
String? sessionRedirect(SessionState s, String location) {
  return switch (s) {
    SessionStarting() || SessionStartFailed() => location == Routes.splash ? null : Routes.splash,
    SessionOnboarding() => location == Routes.onboarding ? null : Routes.onboarding,
    SessionSignedOut() => Routes.auth.contains(location) ? null : Routes.login,
    SessionSignedIn() when s.farm == null => location == Routes.farms ? null : Routes.farms,
    SessionSignedIn() => (location == Routes.splash || location == Routes.onboarding || Routes.auth.contains(location)) ? Routes.dashboard : null,
  };
}

/// Re-evaluates redirects whenever the session changes.
class _SessionListenable extends ChangeNotifier {
  _SessionListenable(Ref ref) {
    ref.listen<SessionState>(sessionProvider, (_, __) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _SessionListenable(ref);
  ref.onDispose(refresh.dispose);
  return GoRouter(
    initialLocation: Routes.splash,
    refreshListenable: refresh,
    debugLogDiagnostics: kDebugMode,
    redirect: (context, state) => sessionRedirect(ref.read(sessionProvider), state.matchedLocation),
    routes: [
      GoRoute(path: Routes.splash, builder: (_, __) => const SplashScreen()),
      GoRoute(path: Routes.onboarding, builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: Routes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: Routes.signup, builder: (_, __) => const SignupScreen()),
      GoRoute(path: Routes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: Routes.farms, builder: (_, __) => const FarmSelectionScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => HomeShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: Routes.dashboard, builder: (_, __) => const DashboardScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: Routes.profile, builder: (_, __) => const ProfileScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: Routes.settings, builder: (_, __) => const SettingsScreen())]),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(body: Center(child: Text('Page not found: ${state.uri.path}'))),
  );
});
