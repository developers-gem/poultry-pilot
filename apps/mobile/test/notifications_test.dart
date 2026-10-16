import 'dart:async';

import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/database/app_database.dart';
import 'package:poultrypilot_mobile/core/push/notification_routes.dart';
import 'package:poultrypilot_mobile/core/push/push_messaging.dart';
import 'package:poultrypilot_mobile/core/push/seen_notifications.dart';
import 'package:poultrypilot_mobile/data/datasources/local/cache_store.dart';
import 'package:poultrypilot_mobile/data/models/account_models.dart';
import 'package:poultrypilot_mobile/data/push/push_registrar.dart';

import 'support.dart';

class FakeMessaging implements PushMessaging {
  PushPermission permission = PushPermission.granted;
  String? currentToken = 'fcm-token-1';
  int deletes = 0;
  final refreshes = StreamController<String>.broadcast();

  @override
  Future<bool> initialize() async => true;
  @override
  Future<PushPermission> requestPermission() async => permission;
  @override
  Future<String?> token() async => currentToken;
  @override
  Future<void> deleteToken() async {
    deletes++;
    currentToken = null;
  }

  @override
  Stream<String> get tokenRefreshes => refreshes.stream;
  @override
  Stream<PushMessage> get foregroundMessages => const Stream.empty();
  @override
  Stream<PushMessage> get openedMessages => const Stream.empty();
  @override
  Future<PushMessage?> initialMessage() async => null;
}

void main() {
  group('preferences and inbox (captured from the API)', () {
    test('all twelve categories, with push and email per category, and quiet hours', () {
      final p = NotificationPreferencesModel.fromJson(fixture('notification_preferences')).toEntity();
      expect(p.categories.map((c) => c.key), ['vaccination_due', 'task_due', 'inventory_low', 'mortality', 'feed', 'water', 'egg_production', 'weight_variance', 'hatch_date', 'order_update', 'payment_update', 'weather_risk']);
      expect(p.quietHours, isNull);
      final saved = NotificationPreferencesModel.fromJson(fixture('notification_preferences_saved')).toEntity();
      expect(saved.categories.firstWhere((c) => c.key == 'feed').push, isFalse);
      expect(saved.quietHours!.start, '21:30');
      expect(saved.emailMinSeverity, 'critical');
    });

    test('the request sent back is the API\'s shape: categories as a map, quiet hours or null', () {
      final saved = NotificationPreferencesModel.fromJson(fixture('notification_preferences_saved')).toEntity();
      final body = notificationPreferencesRequest(saved);
      expect((body['categories'] as Map)['feed'], {'push': false, 'email': true});
      expect(body['quietHours'], {'start': '21:30', 'end': '05:30', 'timezone': 'Asia/Kolkata'});
      expect(notificationPreferencesRequest(saved.copyWith(quietHours: null))['quietHours'], isNull);
    });

    test('inbox and device registration parse', () {
      final inbox = fixture('notifications_inbox');
      final first = InboxItemModel.fromJson((inbox['items'] as List).first as Map<String, dynamic>).toEntity();
      expect(first.category, 'task_due');
      expect(first.path, '/tasks');
      expect(first.read, isFalse);
      expect(PushDeviceModel.fromJson(fixture('push_device_registered')).platform, 'android');
    });
  });

  test('a tapped notification opens the right screen', () {
    expect(routeForNotification(category: 'task_due'), '/tasks');
    expect(routeForNotification(entity: 'task'), '/tasks');
    expect(routeForNotification(category: 'vaccination_due'), '/health');
    expect(routeForNotification(category: 'mortality'), '/production');
    expect(routeForNotification(category: 'order_update'), '/more/notifications');
    expect(routeForNotification(category: 'weather_risk'), '/home');
  });

  test('push data from the API becomes a message', () {
    final m = PushMessage.fromData({'notificationId': 'n1', 'category': 'water', 'path': '/home'}, title: 'Water low', body: 'House A');
    expect(m.notificationId, 'n1');
    expect(m.category, 'water');
    expect(m.title, 'Water low');
  });

  group('never shown twice on the phone', () {
    late AppDatabase db;
    setUp(() => db = AppDatabase(NativeDatabase.memory()));
    tearDown(() => db.close());

    test('the same notification id is shown once, also after the app restarts', () async {
      final seen = SeenNotifications(CacheStore(db));
      expect(await seen.firstTime('n1'), isTrue);
      expect(await seen.firstTime('n1'), isFalse);
      expect(await SeenNotifications(CacheStore(db)).firstTime('n1'), isFalse); // a new start of the app
    });

    test('two copies arriving at the same moment: only one is shown', () async {
      final seen = SeenNotifications(CacheStore(db));
      final results = await Future.wait([seen.firstTime('n2'), seen.firstTime('n2')]);
      expect(results.where((r) => r), hasLength(1));
    });

    test('only the most recent ids are kept', () async {
      final seen = SeenNotifications(CacheStore(db), capacity: 3);
      for (final id in ['a', 'b', 'c', 'd']) {
        await seen.firstTime(id);
      }
      expect(await seen.firstTime('a'), isTrue); // forgotten (oldest)
      expect(await seen.firstTime('d'), isFalse);
    });
  });

  group('push registration', () {
    late AppDatabase db;
    late FakeMessaging messaging;
    late List<String> registered;
    late List<String> removed;
    late bool offline;
    late PushRegistrar registrar;

    setUp(() {
      db = AppDatabase(NativeDatabase.memory());
      messaging = FakeMessaging();
      registered = [];
      removed = [];
      offline = false;
      registrar = PushRegistrar(
        messaging: messaging,
        cache: CacheStore(db),
        platform: 'android',
        registerDevice: ({required platform, required token, deviceName}) async {
          registered.add(token);
          return 'device-${registered.length}';
        },
        removeDevice: (id) async {
          if (offline) throw Exception('offline');
          removed.add(id);
        },
      );
    });
    tearDown(() => db.close());

    test('registers once per person and token (not again on every start)', () async {
      expect(await registrar.enable('u1'), PushPermission.granted);
      await registrar.enable('u1');
      expect(registered, ['fcm-token-1']);
    });

    test('a refreshed token or another person on the phone registers again', () async {
      await registrar.enable('u1');
      expect(await registrar.ensureRegistered('u1', 'fcm-token-2'), isTrue);
      expect(await registrar.ensureRegistered('u2', 'fcm-token-2'), isTrue);
      expect(registered, ['fcm-token-1', 'fcm-token-2', 'fcm-token-2']);
    });

    test('nothing is registered without permission', () async {
      messaging.permission = PushPermission.denied;
      expect(await registrar.enable('u1'), PushPermission.denied);
      expect(registered, isEmpty);
    });

    test('signing out removes the device on the server and replaces the local token', () async {
      await registrar.enable('u1');
      await registrar.disable();
      expect(removed, ['device-1']);
      expect(messaging.deletes, 1);
      expect(await registrar.registered(), isNull);
    });

    test('signing out offline still forgets the registration (the old token is deleted)', () async {
      await registrar.enable('u1');
      offline = true;
      await registrar.disable();
      expect(await registrar.registered(), isNull);
      expect(messaging.deletes, 1);
    });
  });
}
