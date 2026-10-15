import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../entry/daily_entry_view_model.dart';
import '../session/session_controller.dart';

/// More: account, settings, switching farm, and anything waiting to be sent.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final pending = ref.watch(dailyEntryProvider.select((s) => s.pending.length));
    final user = session is SessionSignedIn ? session.account.user : null;
    Widget item(IconData icon, String title, {String? subtitle, VoidCallback? onTap, Color? color}) => ListTile(
          minTileHeight: 64,
          leading: Icon(icon, color: color ?? AppColors.brandInk),
          title: Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: color)),
          subtitle: subtitle == null ? null : Text(subtitle),
          trailing: onTap == null ? null : const Icon(Icons.chevron_right),
          onTap: onTap,
        );
    return ListView(padding: const EdgeInsets.all(16), children: [
      const Eyebrow('More'),
      Text(user?.fullName ?? '', style: Theme.of(context).textTheme.headlineSmall),
      Text('${session.farm?.farmName ?? ''} · ${Fmt.label(session.farm?.role)}', style: const TextStyle(color: AppColors.inkSoft)),
      const SizedBox(height: 14),
      GlassCard(
        padding: EdgeInsets.zero,
        child: Column(children: [
          if (pending > 0) item(Icons.cloud_upload_outlined, '$pending waiting to send', subtitle: 'Saved on this phone while offline', color: AppColors.amberInk, onTap: () => context.go(Routes.entry)),
          item(Icons.person_outline, 'Profile', subtitle: 'Your details, password and devices', onTap: () => context.go(Routes.profile)),
          item(Icons.settings_outlined, 'Settings', subtitle: 'Notifications and data on this phone', onTap: () => context.go(Routes.settings)),
          item(Icons.swap_horiz, 'Switch farm', onTap: () => ref.read(sessionProvider.notifier).clearFarm()),
          item(Icons.logout, 'Sign out', color: AppColors.roseInk, onTap: () async {
            final ok = await showDialog<bool>(
              context: context,
              builder: (c) => AlertDialog(
                title: const Text('Sign out?'),
                content: Text(pending > 0 ? '$pending entr${pending == 1 ? 'y has' : 'ies have'} not been sent yet and will be lost.' : 'Saved data on this phone is cleared.'),
                actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Sign out'))],
              ),
            );
            if (ok == true) await ref.read(sessionProvider.notifier).logout();
          }),
        ]),
      ),
    ]);
  }
}
