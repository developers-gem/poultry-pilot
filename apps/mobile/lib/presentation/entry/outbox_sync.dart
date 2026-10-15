import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../sync/sync_controller.dart';

/// Starts the sync controller and syncs when the app returns to the foreground. (Reconnecting, saving a change
/// and the one-minute timer are handled by the controller itself.)
class SyncTrigger extends ConsumerStatefulWidget {
  const SyncTrigger({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<SyncTrigger> createState() => _SyncTriggerState();
}

class _SyncTriggerState extends ConsumerState<SyncTrigger> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.read(syncControllerProvider.notifier).syncNow();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(syncControllerProvider); // keeps the controller (and its listeners) alive while signed in
    return widget.child;
  }
}
