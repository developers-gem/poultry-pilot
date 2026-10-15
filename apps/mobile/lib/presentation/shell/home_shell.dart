import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/glass.dart';
import '../entry/outbox_sync.dart';
import '../sync/sync_controller.dart';
import '../sync/sync_widgets.dart';

/// Signed-in frame: backdrop, offline banner, and the seven primary tabs. Each tab is at least 48 dp wide on a
/// 360 dp phone; only the selected one shows its label so the icons stay large.
class HomeShell extends ConsumerWidget {
  const HomeShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(syncControllerProvider.select((s) => s.unsent));
    return SyncTrigger(
      child: Scaffold(
        body: Backdrop(
          child: SafeArea(
            bottom: false,
            child: Column(children: [const SyncStatusBar(), Expanded(child: shell)]),
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: shell.currentIndex,
          labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
          height: 72,
          onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
          destinations: [
            const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
            NavigationDestination(icon: Badge(isLabelVisible: pending > 0, label: Text('$pending'), child: const Icon(Icons.edit_note_outlined)), selectedIcon: const Icon(Icons.edit_note), label: 'Daily Entry'),
            const NavigationDestination(icon: Icon(Icons.pets_outlined), selectedIcon: Icon(Icons.pets), label: 'Flocks'),
            const NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: 'Production'),
            const NavigationDestination(icon: Icon(Icons.healing_outlined), selectedIcon: Icon(Icons.healing), label: 'Health'),
            const NavigationDestination(icon: Icon(Icons.task_alt_outlined), selectedIcon: Icon(Icons.task_alt), label: 'Tasks'),
            const NavigationDestination(icon: Icon(Icons.more_horiz), label: 'More'),
          ],
        ),
      ),
    );
  }
}
