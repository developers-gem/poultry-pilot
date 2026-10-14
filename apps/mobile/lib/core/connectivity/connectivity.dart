import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// True while the device has a network connection. Drives the offline banner; screens keep showing cached data.
final isOnlineProvider = StreamProvider<bool>((ref) async* {
  final c = Connectivity();
  bool online(List<ConnectivityResult> r) => r.any((x) => x != ConnectivityResult.none);
  yield online(await c.checkConnectivity());
  yield* c.onConnectivityChanged.map(online);
});
