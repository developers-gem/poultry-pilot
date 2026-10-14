import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/config/app_config.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/account.dart';
import '../session/session_controller.dart';

/// View model: the person's notification preferences (stored on the API, shared with the web app).
class NotificationPreferencesViewModel extends AutoDisposeAsyncNotifier<NotificationPreferences> {
  @override
  Future<NotificationPreferences> build() => ref.watch(settingsRepositoryProvider).notificationPreferences();

  /// Saves at once; on failure the switch returns to what the server holds and the error is passed on.
  Future<void> save(NotificationPreferences next) async {
    final previous = state.valueOrNull;
    state = AsyncData(next);
    try {
      state = AsyncData(await ref.read(settingsRepositoryProvider).saveNotificationPreferences(next));
    } catch (e) {
      if (previous != null) state = AsyncData(previous);
      rethrow;
    }
  }
}

final notificationPreferencesProvider = AsyncNotifierProvider.autoDispose<NotificationPreferencesViewModel, NotificationPreferences>(NotificationPreferencesViewModel.new);

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  static const _severities = {'info': 'Everything', 'warning': 'Warnings and critical', 'critical': 'Critical only'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final prefs = ref.watch(notificationPreferencesProvider);
    final t = Theme.of(context).textTheme;
    Future<void> save(NotificationPreferences p) async {
      try {
        await ref.read(notificationPreferencesProvider.notifier).save(p);
      } catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
      const Eyebrow('Settings'),
      Text('App & notifications', style: t.headlineSmall),
      const SizedBox(height: 14),
      GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Farm', style: t.titleMedium),
          const SizedBox(height: 6),
          Text(session.farm?.farmName ?? 'No farm selected'),
          Text(Fmt.label(session.farm?.role), style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: () => ref.read(sessionProvider.notifier).clearFarm(), child: const Text('Switch farm')),
        ]),
      ),
      const SizedBox(height: 12),
      GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Notifications', style: t.titleMedium),
          Text('Shared with the web app. Alerts always appear in the app.', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
          const SizedBox(height: 6),
          prefs.when(
            loading: () => const Padding(padding: EdgeInsets.all(12), child: LoadingView()),
            error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(notificationPreferencesProvider)),
            data: (p) => Column(children: [
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Push notifications'), value: p.pushEnabled, onChanged: (v) => save(p.copyWith(pushEnabled: v))),
              if (p.pushEnabled) _SeverityPicker(label: 'Push me about', value: p.pushMinSeverity, options: _severities, onChanged: (v) => save(p.copyWith(pushMinSeverity: v))),
              SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Email notifications'), value: p.emailEnabled, onChanged: (v) => save(p.copyWith(emailEnabled: v))),
              if (p.emailEnabled) _SeverityPicker(label: 'Email me about', value: p.emailMinSeverity, options: _severities, onChanged: (v) => save(p.copyWith(emailMinSeverity: v))),
            ]),
          ),
        ]),
      ),
      const SizedBox(height: 12),
      GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Data on this phone', style: t.titleMedium),
          Text('Screens keep the last data loaded so they open offline.', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () async {
              await ref.read(settingsRepositoryProvider).clearCache();
              if (context.mounted) showMessage(context, 'Saved data cleared');
            },
            child: const Text('Clear saved data'),
          ),
        ]),
      ),
      const SizedBox(height: 12),
      GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('About', style: t.titleMedium),
          const SizedBox(height: 6),
          Text('PoultryPilot ${AppConfig.appVersion}'),
          Text('Server: ${AppConfig.apiBaseUrl}', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
        ]),
      ),
      const SizedBox(height: 16),
      FilledButton(
        style: FilledButton.styleFrom(backgroundColor: AppColors.roseInk),
        onPressed: () async {
          final ok = await showDialog<bool>(
            context: context,
            builder: (c) => AlertDialog(
              title: const Text('Sign out?'),
              content: const Text('Saved data on this phone is cleared. Your farm records stay safe on PoultryPilot.'),
              actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Sign out'))],
            ),
          );
          if (ok == true) await ref.read(sessionProvider.notifier).logout();
        },
        child: const Text('Sign out'),
      ),
    ]);
  }
}

class _SeverityPicker extends StatelessWidget {
  const _SeverityPicker({required this.label, required this.value, required this.options, required this.onChanged});

  final String label;
  final String value;
  final Map<String, String> options;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: DropdownButtonFormField<String>(
          value: value,
          decoration: InputDecoration(labelText: label),
          items: [for (final e in options.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
          onChanged: (v) {
            if (v != null) onChanged(v);
          },
        ),
      );
}
