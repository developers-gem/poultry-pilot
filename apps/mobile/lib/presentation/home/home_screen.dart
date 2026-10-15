import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/dashboard.dart';
import '../dashboard/dashboard_view_model.dart';
import '../entry/entry_sheets.dart';
import '../session/session_controller.dart';

/// Home: today at a glance (birds, deaths, feed, water, eggs, weight, alerts, tasks) and one big button to record.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final farm = session.farm;
    if (farm == null) return const SizedBox.shrink();
    final async = ref.watch(dashboardProvider(farm.farmId));
    final name = session is SessionSignedIn ? session.account.user.fullName.split(' ').first : '';
    return Column(children: [
      Expanded(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(dashboardProvider(farm.farmId).future),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 16), physics: const AlwaysScrollableScrollPhysics(), children: [
            BrandLogo(subtitle: farm.farmName),
            const SizedBox(height: 14),
            Text('Good day, $name', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 10),
            ...async.when<List<Widget>>(
              loading: () => const [SkeletonList()],
              error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(dashboardProvider(farm.farmId)))],
              data: (c) => _body(context, c),
            ),
          ]),
        ),
      ),
      if (farm.can('production.record'))
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
          child: SizedBox(
            height: kTarget,
            width: double.infinity,
            child: FilledButton.icon(onPressed: () => context.go(Routes.entry), icon: const Icon(Icons.edit_note, size: 26), label: const Text("Record today", style: TextStyle(fontSize: 18))),
          ),
        ),
    ]);
  }

  List<Widget> _body(BuildContext context, Cached<DashboardSummary> c) {
    final d = c.data;
    final p = d.production;
    final t = d.tasks;
    final tiles = <Widget>[
      _Big(icon: Icons.groups_2_outlined, label: 'Birds', value: Fmt.number(p?.birdsAlive)),
      _Big(icon: Icons.heart_broken_outlined, label: 'Deaths today', value: Fmt.number(p?.mortality), tone: (p?.mortality ?? 0) > 0 ? AppColors.roseInk : null, hint: p == null || p.birdsAlive == 0 ? null : Fmt.percent(p.mortality / (p.birdsAlive + p.mortality) * 100, digits: 2)),
      _Big(icon: Icons.grass, label: 'Feed today', value: p == null ? '—' : '${Fmt.number(p.feedKg)} kg'),
      _Big(icon: Icons.water_drop_outlined, label: 'Water today', value: p == null ? '—' : '${Fmt.number(p.waterLitres)} L'),
      _Big(icon: Icons.egg_outlined, label: 'Eggs today', value: Fmt.number(p?.eggsCollected), hint: p?.henDayPercent == null ? null : 'Hen-day ${Fmt.percent(p!.henDayPercent)}'),
      _Big(icon: Icons.monitor_weight_outlined, label: 'Average weight', value: p?.averageWeightG == null ? '—' : '${Fmt.number(p!.averageWeightG)} g', hint: p?.latestWeighingDate == null ? 'Not weighed yet' : 'Weighed ${Fmt.shortDate(p!.latestWeighingDate)}'),
      _Big(icon: Icons.notifications_active_outlined, label: 'Alerts', value: Fmt.number(d.alerts.open), tone: d.alerts.critical > 0 ? AppColors.roseInk : null, hint: d.alerts.critical > 0 ? '${d.alerts.critical} critical' : null),
      _Big(icon: Icons.task_alt, label: 'Tasks', value: t == null ? '—' : Fmt.number(t.open), tone: (t?.overdue ?? 0) > 0 ? AppColors.roseInk : null, hint: t == null ? null : '${t.dueToday} today · ${t.overdue} overdue', onTap: () => context.go(Routes.tasks)),
    ];
    return [
      if (c.fromCache) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('Offline: saved at ${Fmt.dateTime(c.savedAt.toIso8601String())}', style: const TextStyle(color: AppColors.amberInk))),
      LayoutBuilder(builder: (context, box) {
        final cols = box.maxWidth > 560 ? 4 : 2;
        final w = (box.maxWidth - 10 * (cols - 1)) / cols;
        return Wrap(spacing: 10, runSpacing: 10, children: [for (final x in tiles) SizedBox(width: w, child: x)]);
      }),
      if (p != null && p.flocks.isNotEmpty) ...[
        const SizedBox(height: 14),
        GlassCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("Today's records", style: Theme.of(context).textTheme.titleMedium),
            Text('${p.flocksRecorded} of ${p.flocksTotal} flocks done', style: const TextStyle(color: AppColors.inkSoft)),
            for (final f in p.flocks)
              ListTile(
                minTileHeight: kTarget,
                contentPadding: EdgeInsets.zero,
                leading: Icon(f.recorded ? Icons.check_circle : Icons.radio_button_unchecked, color: f.recorded ? AppColors.mintInk : AppColors.inkSoft),
                title: Text(f.flockCode, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('${Fmt.number(f.birdsAlive)} birds · ${f.mortality} deaths${f.eggsCollected != null && f.eggsCollected! > 0 ? ' · ${Fmt.number(f.eggsCollected)} eggs' : ''}'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('${Routes.entry}?flock=${f.flockId}'),
              ),
          ]),
        ),
      ],
      if (t != null && t.next.isNotEmpty) ...[
        const SizedBox(height: 12),
        GlassCard(
          onTap: () => context.go(Routes.tasks),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Next tasks', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            for (final x in t.next)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Expanded(child: Text(x.title)),
                  Text(x.overdue ? 'Overdue' : (x.dueDate == null ? '' : Fmt.shortDate(x.dueDate)), style: TextStyle(color: x.overdue ? AppColors.roseInk : AppColors.inkSoft, fontWeight: x.overdue ? FontWeight.w600 : null)),
                ]),
              ),
          ]),
        ),
      ],
      if (d.alerts.latest.isNotEmpty) ...[
        const SizedBox(height: 12),
        GlassCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Alerts', style: Theme.of(context).textTheme.titleMedium),
            for (final a in d.alerts.latest.take(3))
              Padding(padding: const EdgeInsets.only(top: 8), child: Text('• ${a.title}', style: TextStyle(color: a.severity == 'critical' ? AppColors.roseInk : AppColors.ink))),
          ]),
        ),
      ],
    ];
  }
}

class _Big extends StatelessWidget {
  const _Big({required this.icon, required this.label, required this.value, this.hint, this.tone, this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final String? hint;
  final Color? tone;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GlassCard(
        onTap: onTap,
        padding: const EdgeInsets.all(14),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 84),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [Icon(icon, size: 20, color: AppColors.brandInk), const SizedBox(width: 6), Expanded(child: Text(label, style: const TextStyle(color: AppColors.inkSoft)))]),
            const SizedBox(height: 8),
            FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: tone ?? AppColors.ink))),
            if (hint != null) Text(hint!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.inkSoft)),
          ]),
        ),
      );
}
