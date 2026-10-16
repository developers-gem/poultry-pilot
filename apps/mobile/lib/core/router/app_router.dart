import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../presentation/auth/forgot_password_screen.dart';
import '../../presentation/auth/login_screen.dart';
import '../../presentation/auth/signup_screen.dart';
import '../../presentation/entry/daily_entry_screen.dart';
import '../../presentation/farms/farm_selection_screen.dart';
import '../../presentation/flocks/flocks_screens.dart';
import '../../presentation/health/health_screen.dart';
import '../../presentation/home/home_screen.dart';
import '../../presentation/more/more_screen.dart';
import '../../presentation/notifications/notification_screens.dart';
import '../../presentation/onboarding/onboarding_screen.dart';
import '../../presentation/production/production_screen.dart';
import '../../presentation/profile/profile_screen.dart';
import '../../presentation/session/session_controller.dart';
import '../../presentation/settings/settings_screen.dart';
import '../../presentation/shell/home_shell.dart';
import '../../presentation/splash/splash_screen.dart';
import '../../presentation/sync/sync_widgets.dart';
import '../../presentation/tasks/tasks_screen.dart';

class Routes {
  const Routes._();
  static const splash = '/splash';
  static const onboarding = '/onboarding';
  static const login = '/login';
  static const signup = '/signup';
  static const forgotPassword = '/forgot-password';
  static const farms = '/farms';
  // The seven tabs, in order.
  static const home = '/home';
  static const entry = '/entry';
  static const flocks = '/flocks';
  static const production = '/production';
  static const health = '/health';
  static const tasks = '/tasks';
  static const more = '/more';
  static const profile = '/more/profile';
  static const settings = '/more/settings';
  static const sync = '/more/sync';
  static const inbox = '/more/notifications';
  static const notificationSettings = '/more/notification-settings';

  static const auth = {login, signup, forgotPassword};
}

/// Where the app must be for a session state (pure, so it is unit-tested). Null means "stay".
String? sessionRedirect(SessionState s, String location) {
  return switch (s) {
    SessionStarting() || SessionStartFailed() => location == Routes.splash ? null : Routes.splash,
    SessionOnboarding() => location == Routes.onboarding ? null : Routes.onboarding,
    SessionSignedOut() => Routes.auth.contains(location) ? null : Routes.login,
    SessionSignedIn() when s.farm == null => location == Routes.farms ? null : Routes.farms,
    SessionSignedIn() => (location == Routes.splash || location == Routes.onboarding || location == '/' || Routes.auth.contains(location)) ? Routes.home : null,
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
  StatefulShellBranch tab(String path, Widget Function(GoRouterState) page, {List<RouteBase> routes = const []}) =>
      StatefulShellBranch(routes: [GoRoute(path: path, builder: (_, state) => page(state), routes: routes)]);
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
          tab(Routes.home, (_) => const HomeScreen()),
          // /entry?flock=<id>&date=<yyyy-mm-dd> opens a given flock and day.
          tab(Routes.entry, (s) => DailyEntryScreen(flockId: s.uri.queryParameters['flock'], date: s.uri.queryParameters['date'])),
          tab(Routes.flocks, (_) => const FlocksScreen(), routes: [GoRoute(path: ':flockId', builder: (_, s) => FlockDetailScreen(flockId: s.pathParameters['flockId']!))]),
          tab(Routes.production, (_) => const ProductionScreen()),
          tab(Routes.health, (_) => const HealthScreen()),
          tab(Routes.tasks, (_) => const TasksScreen()),
          tab(Routes.more, (_) => const MoreScreen(), routes: [
            GoRoute(path: 'profile', builder: (_, __) => const _Titled(title: 'Profile', child: ProfileScreen())),
            GoRoute(path: 'settings', builder: (_, __) => const _Titled(title: 'Settings', child: SettingsScreen())),
            GoRoute(path: 'sync', builder: (_, __) => const _Titled(title: 'Sync', child: SyncScreen())),
            GoRoute(path: 'notifications', builder: (_, __) => const _Titled(title: 'Notifications', child: InboxScreen())),
            GoRoute(path: 'notification-settings', builder: (_, __) => const _Titled(title: 'Notification settings', child: NotificationSettingsScreen())),
          ]),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(body: Center(child: Text('Page not found: ${state.uri.path}'))),
  );
});

/// A pushed page inside a tab, with a back button.
class _Titled extends StatelessWidget {
  const _Titled({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(backgroundColor: Colors.transparent, appBar: AppBar(title: Text(title)), body: child);
}
