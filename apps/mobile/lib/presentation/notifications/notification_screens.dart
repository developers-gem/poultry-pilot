import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/push/notification_routes.dart';
import '../../core/push/push_messaging.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/account.dart';
import '../auth/auth_view_model.dart';
import '../settings/settings_screen.dart';
import 'push_controller.dart';

/// What to be told about, and how: push and email per category, alert thresholds, quiet hours.
class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  static const _severities = {'info': 'Everything', 'warning': 'Warnings and critical', 'critical': 'Critical only'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prefs = ref.watch(notificationPreferencesProvider);
    final push = ref.watch(pushControllerProvider);
    final t = Theme.of(context).textTheme;
    Future<void> save(NotificationPreferences p) async {
      try {
        await ref.read(notificationPreferencesProvider.notifier).save(p);
      } catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    String hhmm(TimeOfDay x) => '${x.hour.toString().padLeft(2, '0')}:${x.minute.toString().padLeft(2, '0')}';
    TimeOfDay tod(String s) => TimeOfDay(hour: int.parse(s.substring(0, 2)), minute: int.parse(s.substring(3, 5)));

    return prefs.when(
      loading: () => const Center(child: LoadingView()),
      error: (e, _) => Padding(padding: const EdgeInsets.all(16), child: ErrorView(error: e, onRetry: () => ref.invalidate(notificationPreferencesProvider))),
      data: (p) => ListView(padding: const EdgeInsets.all(16), children: [
        if (!push.available)
          const _Note(icon: Icons.notifications_off_outlined, text: "Push isn't set up in this version of the app. You still get every notification in the inbox.")
        else if (push.permission == PushPermission.denied)
          const _Note(icon: Icons.block, text: "Notifications are blocked for PoultryPilot in your phone's settings. Allow them there to get pushes."),
        GlassCard(
          child: Column(children: [
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Push notifications'), subtitle: const Text('On this phone'), value: p.pushEnabled, onChanged: (v) => save(p.copyWith(pushEnabled: v))),
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Email'), value: p.emailEnabled, onChanged: (v) => save(p.copyWith(emailEnabled: v))),
          ]),
        ),
        const SizedBox(height: 12),
        GlassCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('What to be told about', style: t.titleMedium),
            const Text('Every notification is always kept in the inbox.', style: TextStyle(color: AppColors.inkSoft)),
            const SizedBox(height: 4),
            Row(children: const [Spacer(), SizedBox(width: 64, child: Text('Push', textAlign: TextAlign.center)), SizedBox(width: 64, child: Text('Email', textAlign: TextAlign.center))]),
            for (final c in p.categories)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(c.label, style: const TextStyle(fontWeight: FontWeight.w600)), Text(c.description, style: const TextStyle(color: AppColors.inkSoft, fontSize: 12))])),
                  SizedBox(width: 64, child: Switch(value: c.push && p.pushEnabled, onChanged: p.pushEnabled ? (v) => save(p.copyWith(categories: [for (final x in p.categories) x.key == c.key ? x.copyWith(push: v) : x])) : null)),
                  SizedBox(width: 64, child: Switch(value: c.email && p.emailEnabled, onChanged: p.emailEnabled ? (v) => save(p.copyWith(categories: [for (final x in p.categories) x.key == c.key ? x.copyWith(email: v) : x])) : null)),
                ]),
              ),
          ]),
        ),
        const SizedBox(height: 12),
        GlassCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Farm alerts', style: t.titleMedium),
            const Text('Deaths, eggs, feed, water, weight, stock, weather: how serious before you are told.', style: TextStyle(color: AppColors.inkSoft)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(value: p.pushMinSeverity, decoration: const InputDecoration(labelText: 'Push me about'), items: [for (final e in _severities.entries) DropdownMenuItem(value: e.key, child: Text(e.value))], onChanged: (v) {
              if (v != null) save(p.copyWith(pushMinSeverity: v));
            }),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(value: p.emailMinSeverity, decoration: const InputDecoration(labelText: 'Email me about'), items: [for (final e in _severities.entries) DropdownMenuItem(value: e.key, child: Text(e.value))], onChanged: (v) {
              if (v != null) save(p.copyWith(emailMinSeverity: v));
            }),
          ]),
        ),
        const SizedBox(height: 12),
        GlassCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Quiet hours'),
              subtitle: const Text('Pushes wait until morning. Critical alerts still come through.'),
              value: p.quietHours != null,
              onChanged: (on) async => save(p.copyWith(quietHours: on ? QuietHours(start: '21:00', end: '06:00', timezone: await deviceTimezone()) : null)),
            ),
            if (p.quietHours != null)
              Row(children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final x = await showTimePicker(context: context, initialTime: tod(p.quietHours!.start));
                      if (x != null) await save(p.copyWith(quietHours: p.quietHours!.copyWith(start: hhmm(x), timezone: await deviceTimezone())));
                    },
                    child: Text('From ${p.quietHours!.start}'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () async {
                      final x = await showTimePicker(context: context, initialTime: tod(p.quietHours!.end));
                      if (x != null) await save(p.copyWith(quietHours: p.quietHours!.copyWith(end: hhmm(x), timezone: await deviceTimezone())));
                    },
                    child: Text('Until ${p.quietHours!.end}'),
                  ),
                ),
              ]),
          ]),
        ),
      ]),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: GlassCard(child: Row(children: [Icon(icon, color: AppColors.amberInk), const SizedBox(width: 10), Expanded(child: Text(text))])),
      );
}

/// The inbox: every notification, newest first; tap to open what it is about.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(inboxProvider);
    Future<void> read(List<String> ids) async {
      try {
        await ref.read(settingsRepositoryProvider).markRead(ids);
        ref.invalidate(inboxProvider);
      } catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return RefreshIndicator(
      onRefresh: () => ref.refresh(inboxProvider.future),
      child: async.when(
        loading: () => const Center(child: LoadingView()),
        error: (e, _) => ListView(padding: const EdgeInsets.all(16), children: [ErrorView(error: e, onRetry: () => ref.invalidate(inboxProvider))]),
        data: (inbox) => ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
          Row(children: [
            Expanded(child: Text(inbox.unread == 0 ? 'All read' : '${inbox.unread} unread', style: Theme.of(context).textTheme.titleMedium)),
            if (inbox.unread > 0) TextButton(onPressed: () => read(const []), child: const Text('Mark all read')),
          ]),
          if (inbox.items.isEmpty) const EmptyView(title: 'No notifications yet.'),
          for (final n in inbox.items)
            Card(
              elevation: 0,
              color: n.read ? Colors.white.withValues(alpha: 0.6) : AppColors.brand.withValues(alpha: 0.10),
              child: ListTile(
                minTileHeight: 64,
                leading: Icon(_icon(n.category), color: n.severity == 'critical' ? AppColors.roseInk : AppColors.brandInk),
                title: Text(n.title, style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w700)),
                subtitle: Text([if (n.body != null) n.body!, Fmt.dateTime(n.createdAt)].join('\n')),
                isThreeLine: n.body != null,
                onTap: () async {
                  if (!n.read) await read([n.id]);
                  if (context.mounted) context.go(routeForNotification(category: n.category, entity: n.entity));
                },
              ),
            ),
        ]),
      ),
    );
  }

  static IconData _icon(String? c) => switch (c) {
        'vaccination_due' => Icons.vaccines_outlined,
        'task_due' => Icons.task_alt,
        'inventory_low' => Icons.inventory_2_outlined,
        'mortality' => Icons.heart_broken_outlined,
        'feed' => Icons.grass,
        'water' => Icons.water_drop_outlined,
        'egg_production' => Icons.egg_outlined,
        'weight_variance' => Icons.monitor_weight_outlined,
        'hatch_date' => Icons.egg_alt_outlined,
        'order_update' => Icons.shopping_bag_outlined,
        'payment_update' => Icons.payments_outlined,
        'weather_risk' => Icons.thunderstorm_outlined,
        _ => Icons.notifications_outlined,
      };
}
