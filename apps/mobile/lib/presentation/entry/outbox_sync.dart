import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/connectivity/connectivity.dart';
import '../../core/providers.dart';
import 'daily_entry_view_model.dart';

/// Sends entries saved offline: when the connection comes back and when the app returns to the foreground.
class OutboxSync extends ConsumerStatefulWidget {
  const OutboxSync({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<OutboxSync> createState() => _OutboxSyncState();
}

class _OutboxSyncState extends ConsumerState<OutboxSync> with WidgetsBindingObserver {
  bool _running = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _sync());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _sync();
  }

  Future<void> _sync() async {
    if (_running) return;
    _running = true;
    try {
      await ref.read(dailyEntryRepositoryProvider).sync();
      await ref.read(dailyEntryProvider.notifier).refreshPending();
    } catch (_) {
      // Still offline or the server is busy: try again on the next reconnect or resume.
    } finally {
      _running = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
      if (next.valueOrNull == true && prev?.valueOrNull != true) _sync();
    });
    return widget.child;
  }
}
