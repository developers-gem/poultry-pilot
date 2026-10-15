import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/entities/farm_work.dart';
import '../session/session_controller.dart';

/// Production over the last days: eggs, feed, water and deaths, for the whole farm or one flock.
final _rangeProvider = StateProvider.autoDispose<int>((ref) => 14);
final _flockFilterProvider = StateProvider.autoDispose<String?>((ref) => null);

final _trendsProvider = FutureProvider.autoDispose<Cached<List<TrendDay>>>((ref) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  final days = ref.watch(_rangeProvider);
  final flockId = ref.watch(_flockFilterProvider);
  final now = DateTime.now();
  String iso(DateTime d) => d.toIso8601String().substring(0, 10);
  return ref.watch(farmWorkRepositoryProvider).trends(farmId, from: iso(now.subtract(Duration(days: days - 1))), to: iso(now), flockId: flockId);
});

final _flockListProvider = FutureProvider.autoDispose<List<FlockSummary>>((ref) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  return (await ref.watch(farmWorkRepositoryProvider).flocks(farmId)).data;
});

class ProductionScreen extends ConsumerWidget {
  const ProductionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_trendsProvider);
    final range = ref.watch(_rangeProvider);
    final flocks = ref.watch(_flockListProvider).valueOrNull ?? const [];
    final flockId = ref.watch(_flockFilterProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(_trendsProvider.future),
      child: ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
        const Eyebrow('Production'),
        Text('Last $range days', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 10),
        SegmentedButton<int>(
          segments: const [ButtonSegment(value: 7, label: Text('7 days')), ButtonSegment(value: 14, label: Text('14 days')), ButtonSegment(value: 30, label: Text('30 days'))],
          selected: {range},
          style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, 48))),
          onSelectionChanged: (s) => ref.read(_rangeProvider.notifier).state = s.first,
        ),
        if (flocks.length > 1) ...[
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: const Text('All flocks'), selected: flockId == null, onSelected: (_) => ref.read(_flockFilterProvider.notifier).state = null)),
              for (final f in flocks) Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(f.flockCode), selected: flockId == f.id, onSelected: (_) => ref.read(_flockFilterProvider.notifier).state = f.id)),
            ]),
          ),
        ],
        const SizedBox(height: 12),
        ...async.when<List<Widget>>(
          loading: () => const [SkeletonList()],
          error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(_trendsProvider))],
          data: (c) {
            final days = c.data;
            int sumI(int Function(TrendDay) f) => days.fold(0, (t, d) => t + f(d));
            double sumD(double Function(TrendDay) f) => days.fold(0.0, (t, d) => t + f(d));
            return [
              if (c.fromCache) Text('Offline: saved at ${Fmt.dateTime(c.savedAt.toIso8601String())}', style: const TextStyle(color: AppColors.amberInk)),
              _Chart(title: 'Eggs', total: Fmt.number(sumI((d) => d.eggsCollected)), values: days.map((d) => d.eggsCollected.toDouble()).toList(), color: AppColors.cyan),
              _Chart(title: 'Feed', total: '${Fmt.number(sumD((d) => d.feedKg))} kg', values: days.map((d) => d.feedKg).toList(), color: AppColors.accent),
              _Chart(title: 'Water', total: '${Fmt.number(sumD((d) => d.waterLitres))} L', values: days.map((d) => d.waterLitres).toList(), color: AppColors.brand),
              _Chart(title: 'Deaths', total: Fmt.number(sumI((d) => d.mortality)), values: days.map((d) => d.mortality.toDouble()).toList(), color: AppColors.rose),
              Padding(padding: const EdgeInsets.only(top: 4), child: Text('${days.where((d) => d.records > 0).length} of ${days.length} days have records.', style: const TextStyle(color: AppColors.inkSoft))),
            ];
          },
        ),
      ]),
    );
  }
}

/// A simple bar chart: one bar per day, today highlighted. Values are announced for screen readers.
class _Chart extends StatelessWidget {
  const _Chart({required this.title, required this.total, required this.values, required this.color});

  final String title;
  final String total;
  final List<double> values;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final max = values.fold(0.0, (m, v) => v > m ? v : m);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)), Text(total, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))]),
          const SizedBox(height: 10),
          Semantics(
            label: '$title by day: ${values.map((v) => Fmt.number(v)).join(', ')}',
            child: SizedBox(
              height: 80,
              child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                for (var i = 0; i < values.length; i++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1.5),
                      child: Container(
                        height: max == 0 ? 3 : 3 + (values[i] / max) * 77,
                        decoration: BoxDecoration(color: i == values.length - 1 ? color : color.withValues(alpha: 0.45), borderRadius: const BorderRadius.vertical(top: Radius.circular(4))),
                      ),
                    ),
                  ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}
