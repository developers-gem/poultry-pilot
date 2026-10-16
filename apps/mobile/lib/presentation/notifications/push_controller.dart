import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/push/notification_routes.dart';
import '../../core/push/push_messaging.dart';
import '../../core/push/seen_notifications.dart';
import '../../core/router/app_router.dart';
import '../../data/push/push_registrar.dart';
import '../../domain/entities/account.dart';

final pushMessagingProvider = Provider<PushMessaging>((ref) => FirebasePushMessaging());
final seenNotificationsProvider = Provider<SeenNotifications>((ref) => SeenNotifications(ref.watch(cacheStoreProvider)));
final pushRegistrarProvider = Provider<PushRegistrar>((ref) {
  final api = ref.watch(apiProvider);
  return PushRegistrar(
    messaging: ref.watch(pushMessagingProvider),
    cache: ref.watch(cacheStoreProvider),
    registerDevice: ({required platform, required token, deviceName}) async => (await api.registerPushDevice(platform: platform, token: token, deviceName: deviceName)).id,
    removeDevice: api.removePushDevice,
    platform: Platform.isIOS ? 'ios' : 'android',
    deviceName: Platform.isIOS ? 'iPhone' : 'Android phone',
  );
});

/// Shows banners for pushes that arrive while the app is open (set in main.dart).
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// The in-app notifications (inbox), refreshed when a push arrives.
final inboxProvider = FutureProvider.autoDispose<({int unread, List<InboxNotification> items})>((ref) => ref.watch(settingsRepositoryProvider).inbox());

class PushState {
  const PushState({this.available = true, this.permission = PushPermission.notDetermined});

  /// False when Firebase is not set up in this build.
  final bool available;
  final PushPermission permission;
}

/// Push for the signed-in person: registration, taps (open the right screen), and messages while the app is open
/// (a banner, shown once per notification).
class PushController extends Notifier<PushState> {
  final _subs = <StreamSubscription<Object?>>[];
  bool _initialised = false;
  String? _userId;

  @override
  PushState build() {
    ref.onDispose(() {
      for (final s in _subs) {
        s.cancel();
      }
    });
    return const PushState();
  }

  PushMessaging get _messaging => ref.read(pushMessagingProvider);

  Future<void> start(String userId) async {
    _userId = userId;
    if (!_initialised) {
      _initialised = true;
      final ok = await _messaging.initialize();
      state = PushState(available: ok, permission: ok ? state.permission : PushPermission.unavailable);
      if (!ok) return;
      _subs.add(_messaging.foregroundMessages.listen(_onForeground));
      _subs.add(_messaging.openedMessages.listen(_open));
      _subs.add(_messaging.tokenRefreshes.listen((token) {
        final user = _userId;
        if (user != null) ref.read(pushRegistrarProvider).ensureRegistered(user, token).catchError((_) => false);
      }));
      final initial = await _messaging.initialMessage();
      if (initial != null) await _open(initial);
    }
    if (!state.available) return;
    try {
      final permission = await ref.read(pushRegistrarProvider).enable(userId);
      state = PushState(available: true, permission: permission);
    } catch (_) {
      // Offline at start: registration is retried at the next start or token refresh.
    }
  }

  /// Before signing out.
  Future<void> stop() async {
    _userId = null;
    if (state.available) await ref.read(pushRegistrarProvider).disable();
  }

  Future<void> _onForeground(PushMessage m) async {
    final id = m.notificationId;
    if (id != null && !await ref.read(seenNotificationsProvider).firstTime(id)) return;
    ref.invalidate(inboxProvider);
    scaffoldMessengerKey.currentState?.showSnackBar(SnackBar(
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(m.title, style: const TextStyle(fontWeight: FontWeight.w700)),
        if (m.body.isNotEmpty) Text(m.body),
      ]),
      action: SnackBarAction(label: 'Open', onPressed: () => _go(m)),
      duration: const Duration(seconds: 6),
    ));
  }

  Future<void> _open(PushMessage m) async {
    final id = m.notificationId;
    if (id != null) await ref.read(seenNotificationsProvider).firstTime(id);
    ref.invalidate(inboxProvider);
    _go(m);
  }

  void _go(PushMessage m) => ref.read(routerProvider).go(routeForNotification(category: m.category, entity: m.entity));
}

final pushControllerProvider = NotifierProvider<PushController, PushState>(PushController.new);
