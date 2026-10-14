import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/dashboard.dart';
import '../session/session_controller.dart';
import 'dashboard_view_model.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final farm = session.farm;
    if (farm == null) return const SizedBox.shrink();
    final async = ref.watch(dashboardProvider(farm.farmId));
    final name = session is SessionSignedIn ? session.account.user.fullName.split(' ').first : '';
    return RefreshIndicator(
      color: AppColors.brand,
      onRefresh: () => ref.refresh(dashboardProvider(farm.farmId).future),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          Row(children: [
            Expanded(child: BrandLogo(subtitle: farm.farmName)),
            IconButton(tooltip: 'Switch farm', icon: const Icon(Icons.swap_horiz), onPressed: () => ref.read(sessionProvider.notifier).clearFarm()),
          ]),
          const SizedBox(height: 18),
          Eyebrow('Overview · ${Fmt.label(farm.role)}'),
          const SizedBox(height: 2),
          Text('Good day, $name', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 14),
          ...async.when<List<Widget>>(
            loading: () => const [SkeletonList()],
            error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(dashboardProvider(farm.farmId)))],
            data: (c) => _content(context, c),
          ),
        ],
      ),
    );
  }

  List<Widget> _content(BuildContext context, Cached<DashboardSummary> c) {
    final d = c.data;
    final t = Theme.of(context).textTheme;
    final p = d.production;
    final money = d.finance;
    Widget section(String title, List<Widget> children) => Padding(
          padding: const EdgeInsets.only(top: 12),
          child: GlassCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: t.titleMedium), const SizedBox(height: 10), ...children])),
        );
    return [
      if (c.fromCache)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Text('Showing data saved on this phone at ${Fmt.dateTime(c.savedAt.toIso8601String())}. Pull down to refresh when online.', style: t.bodySmall?.copyWith(color: AppColors.amberInk)),
        ),
      GridView.count(
        crossAxisCount: MediaQuery.sizeOf(context).width > 600 ? 4 : 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.25,
        children: [
          StatTile(label: 'Birds alive', value: Fmt.number(p?.birdsAlive), hint: p == null ? null : '${p.flocksRecorded} of ${p.flocksTotal} flocks recorded today'),
          StatTile(label: 'Eggs today', value: Fmt.number(p?.eggsCollected), badge: p?.henDayPercent == null ? null : 'Hen-day ${Fmt.percent(p!.henDayPercent)}', badgeTone: Tone.cyan, hint: p == null ? null : '${Fmt.number(p.eggsBroken)} broken'),
          StatTile(label: 'Deaths today', value: Fmt.number(p?.mortality), badgeTone: Tone.rose),
          StatTile(label: 'Open alerts', value: Fmt.number(d.alerts.open), badge: d.alerts.critical > 0 ? '${d.alerts.critical} critical' : null, badgeTone: Tone.rose),
        ],
      ),
      if (d.alerts.latest.isNotEmpty)
        section('Farm alerts', [
          for (final a in d.alerts.latest.take(3))
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: _severity(a.severity).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(AppTheme.radius)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(a.title, style: const TextStyle(fontWeight: FontWeight.w600)), Text('${Fmt.label(a.severity)} · ${Fmt.shortDate(a.date)}', style: t.bodySmall?.copyWith(color: AppColors.inkSoft))]),
            ),
        ]),
      if (d.weather != null)
        section('Weather', [
          Text('${Fmt.number(d.weather!.temperatureC, digits: 1)} °C now · ${Fmt.number(d.weather!.humidityPercent)}% humidity', style: t.bodyLarge),
          if (d.weather!.todayMaxC != null) Text('Today ${Fmt.number(d.weather!.todayMinC)}–${Fmt.number(d.weather!.todayMaxC)} °C', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
          for (final r in d.weather!.risks) Padding(padding: const EdgeInsets.only(top: 6), child: Text('⚠ $r', style: const TextStyle(color: AppColors.roseInk))),
          if (d.weather!.stale) Text('Last forecast received; the weather service is not answering.', style: t.bodySmall?.copyWith(color: AppColors.amberInk)),
        ])
      else if (d.weatherUnavailable != null)
        section('Weather', [Text(d.weatherUnavailable!, style: t.bodyMedium?.copyWith(color: AppColors.inkSoft))]),
      if (p != null)
        section('Flocks today', [
          if (p.flocks.isEmpty) const EmptyView(title: 'No active flocks yet.', body: 'Add a batch on the web app to see it here.'),
          for (final f in p.flocks)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${f.flockCode} · ${Fmt.label(f.type)}'),
              subtitle: Text('${Fmt.number(f.birdsAlive)} birds · ${f.mortality} deaths${f.eggsCollected != null ? ' · ${Fmt.number(f.eggsCollected)} eggs' : ''}'),
              trailing: Pill(f.recorded ? 'Recorded' : 'Not yet', tone: f.recorded ? Tone.mint : Tone.amber),
            ),
        ]),
      if (money != null)
        section('Money this month', [
          Row(children: [
            Expanded(child: _kv(context, 'Revenue', Fmt.money(money.monthRevenueMinor, d.currency))),
            Expanded(child: _kv(context, 'Expenses', Fmt.money(money.monthExpensesMinor, d.currency))),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: _kv(context, 'Profit', Fmt.money(money.monthProfitMinor, d.currency), color: money.monthProfitMinor < 0 ? AppColors.roseInk : AppColors.mintInk)),
            Expanded(child: _kv(context, 'Cash', Fmt.money(money.cashMinor, d.currency))),
          ]),
          const SizedBox(height: 8),
          Text('Owed to you ${Fmt.money(money.receivablesMinor, d.currency)} · you owe ${Fmt.money(money.payablesMinor, d.currency)}', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
        ]),
      if (d.inventory != null)
        section('Stock', [
          Text(d.inventory!.feedDaysRemaining == null ? 'Feed days left: not enough use recorded yet' : 'About ${d.inventory!.feedDaysRemaining} days of feed left'),
          Text('${Fmt.number(d.inventory!.eggsInStock)} eggs in stock · ${d.inventory!.lowStockItems} items low', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
        ]),
      if (d.hatchery != null && d.hatchery!.incubating > 0)
        section('Hatchery', [
          Text('${Fmt.number(d.hatchery!.eggsIncubating)} eggs in ${d.hatchery!.incubating} batches'),
          if (d.hatchery!.nextHatchCode != null) Text('Next hatch: ${d.hatchery!.nextHatchCode} on ${Fmt.shortDate(d.hatchery!.nextHatchDate)}', style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
        ]),
      section('Coming up', [
        if (d.upcoming.isEmpty) Text('Nothing scheduled this week.', style: t.bodyMedium?.copyWith(color: AppColors.inkSoft)),
        for (final e in d.upcoming.take(6))
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(children: [
              Expanded(child: Text(e.title)),
              Text(e.overdue ? 'Overdue' : Fmt.shortDate(e.date), style: TextStyle(color: e.overdue ? AppColors.roseInk : AppColors.inkSoft, fontWeight: e.overdue ? FontWeight.w600 : null)),
            ]),
          ),
      ]),
    ];
  }

  static Widget _kv(BuildContext context, String k, String v, {Color? color}) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(k, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.inkSoft)),
        Text(v, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color)),
      ]);

  static Color _severity(String s) => switch (s) { 'critical' => AppColors.rose, 'warning' => AppColors.amber, _ => AppColors.cyan };
}
