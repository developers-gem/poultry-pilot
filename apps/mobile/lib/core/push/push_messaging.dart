import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

/// A push received from the PoultryPilot API (via FCM). The data fields are set by the API's FCM provider.
class PushMessage {
  const PushMessage({required this.title, required this.body, this.notificationId, this.category, this.severity, this.path, this.entity, this.entityId});

  final String title;
  final String body;
  final String? notificationId;
  final String? category;
  final String? severity;
  final String? path;
  final String? entity;
  final String? entityId;

  factory PushMessage.fromData(Map<String, dynamic> data, {String? title, String? body}) => PushMessage(
        title: title ?? (data['title'] as String? ?? 'PoultryPilot'),
        body: body ?? (data['body'] as String? ?? ''),
        notificationId: data['notificationId'] as String?,
        category: data['category'] as String?,
        severity: data['severity'] as String?,
        path: data['path'] as String?,
        entity: data['entity'] as String?,
        entityId: data['entityId'] as String?,
      );
}

enum PushPermission { granted, denied, notDetermined, unavailable }

/// What the app needs from the push service (Firebase in the app, a fake in tests).
abstract class PushMessaging {
  /// False when Firebase is not configured in this build: push is then off and the app works without it.
  Future<bool> initialize();
  Future<PushPermission> requestPermission();
  Future<String?> token();
  Future<void> deleteToken();
  Stream<String> get tokenRefreshes;

  /// Messages that arrive while the app is open (the system does not show these itself).
  Stream<PushMessage> get foregroundMessages;

  /// The person tapped a notification while the app was in the background.
  Stream<PushMessage> get openedMessages;

  /// The person opened the app by tapping a notification.
  Future<PushMessage?> initialMessage();
}

class FirebasePushMessaging implements PushMessaging {
  bool _ready = false;

  static PushMessage _from(RemoteMessage m) => PushMessage.fromData(m.data, title: m.notification?.title, body: m.notification?.body);

  @override
  Future<bool> initialize() async {
    try {
      // Needs google-services.json / GoogleService-Info.plist (flutterfire configure). Without them, push is off.
      if (Firebase.apps.isEmpty) await Firebase.initializeApp();
      _ready = true;
    } catch (_) {
      _ready = false;
    }
    return _ready;
  }

  @override
  Future<PushPermission> requestPermission() async {
    if (!_ready) return PushPermission.unavailable;
    final s = await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
    return switch (s.authorizationStatus) {
      AuthorizationStatus.authorized || AuthorizationStatus.provisional => PushPermission.granted,
      AuthorizationStatus.denied => PushPermission.denied,
      _ => PushPermission.notDetermined,
    };
  }

  @override
  Future<String?> token() async => _ready ? FirebaseMessaging.instance.getToken() : null;

  @override
  Future<void> deleteToken() async {
    if (_ready) await FirebaseMessaging.instance.deleteToken();
  }

  @override
  Stream<String> get tokenRefreshes => _ready ? FirebaseMessaging.instance.onTokenRefresh : const Stream.empty();

  @override
  Stream<PushMessage> get foregroundMessages => _ready ? FirebaseMessaging.onMessage.map(_from) : const Stream.empty();

  @override
  Stream<PushMessage> get openedMessages => _ready ? FirebaseMessaging.onMessageOpenedApp.map(_from) : const Stream.empty();

  @override
  Future<PushMessage?> initialMessage() async {
    if (!_ready) return null;
    final m = await FirebaseMessaging.instance.getInitialMessage();
    return m == null ? null : _from(m);
  }
}
