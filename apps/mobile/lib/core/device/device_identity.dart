import 'dart:io' show Platform;
import 'dart:math';

import '../storage/token_store.dart';

/// Identifies this install to the API (shown in Profile → Devices), so each phone is one named session.
class DeviceIdentity {
  const DeviceIdentity({required this.deviceId, required this.name, required this.platform});

  final String deviceId;
  final String name;

  /// One of the API's session platforms: android, ios, other.
  final String platform;

  Map<String, dynamic> toJson() => {'deviceId': deviceId, 'name': name, 'platform': platform};

  /// A random id created once per install and kept in secure storage (no hardware identifiers are read).
  static Future<DeviceIdentity> load(TokenStore store) async {
    var id = await store.readDeviceId();
    if (id == null) {
      final rnd = Random.secure();
      id = List.generate(16, (_) => rnd.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
      await store.saveDeviceId(id);
    }
    final platform = Platform.isAndroid ? 'android' : (Platform.isIOS ? 'ios' : 'other');
    final name = Platform.isAndroid ? 'Android phone' : (Platform.isIOS ? 'iPhone' : 'PoultryPilot app');
    return DeviceIdentity(deviceId: id, name: name, platform: platform);
  }
}
