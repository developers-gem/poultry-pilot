import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/entities/farm_work.dart';
import '../entry/entry_sheets.dart';
import '../session/session_controller.dart';

final _flocksProvider = FutureProvider.autoDispose<(Cached<List<FlockSummary>>, Map<String, String>)>((ref) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  final repo = ref.watch(farmWorkRepositoryProvider);
  final flocks = await repo.flocks(farmId);
  final houses = await repo.houses(farmId).catchError((_) => <HouseItem>[]);
  return (flocks, {for (final h in houses) h.id: h.name});
});

final _flockDetailProvider = FutureProvider.autoDispose.family<(FlockDetail, List<WeighIn>), String>((ref, flockId) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  final repo = ref.watch(farmWorkRepositoryProvider);
  return (await repo.flock(farmId, flockId), await repo.weighIns(farmId, flockId));
});

class FlocksScreen extends ConsumerWidget {
  const FlocksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_flocksProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(_flocksProvider.future),
      child: ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
        const Eyebrow('Flocks'),
        Text('Active flocks', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        ...async.when<List<Widget>>(
          loading: () => const [SkeletonList()],
          error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(_flocksProvider))],
          data: (r) {
            final (flocks, houses) = r;
            if (flocks.data.isEmpty) return const [EmptyView(title: 'No active flocks', body: 'Place a flock on the web app.')];
            return [
              if (flocks.fromCache) Text('Offline: saved at ${Fmt.dateTime(flocks.savedAt.toIso8601String())}', style: const TextStyle(color: AppColors.amberInk)),
              for (final f in flocks.data)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: GlassCard(
                    onTap: () => context.go('${Routes.flocks}/${f.id}'),
                    child: Row(children: [
                      Container(width: 48, height: 48, alignment: Alignment.center, decoration: BoxDecoration(color: AppColors.brand.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(14)), child: Text(f.flockCode, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.brandInk, fontSize: 12))),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(f.name, style: Theme.of(context).textTheme.titleMedium),
                          Text('${houses[f.houseId] ?? ''} · ${Fmt.label(f.type)}${f.breed != null ? ' · ${f.breed}' : ''}', style: const TextStyle(color: AppColors.inkSoft)),
                          Text('${Fmt.number(f.currentBirdCount)} birds${f.placementDate != null ? ' · day ${DateTime.now().difference(DateTime.parse(f.placementDate!)).inDays}' : ''}'),
                        ]),
                      ),
                      const Icon(Icons.chevron_right),
                    ]),
                  ),
                ),
            ];
          },
        ),
      ]),
    );
  }
}

class FlockDetailScreen extends ConsumerWidget {
  const FlockDetailScreen({super.key, required this.flockId});

  final String flockId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_flockDetailProvider(flockId));
    final canRecord = ref.watch(sessionProvider).farm?.can('production.record') ?? false;
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(title: Text(async.valueOrNull?.$1.flock.flockCode ?? 'Flock')),
      body: async.when(
        loading: () => const Padding(padding: EdgeInsets.all(16), child: SkeletonList()),
        error: (e, _) => Padding(padding: const EdgeInsets.all(16), child: ErrorView(error: e, onRetry: () => ref.invalidate(_flockDetailProvider(flockId)))),
        data: (r) {
          final (d, weighIns) = r;
          Widget kv(String k, String v) => Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(k, style: const TextStyle(color: AppColors.inkSoft, fontSize: 12)), Text(v, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700))]));
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text(d.flock.name, style: Theme.of(context).textTheme.headlineSmall),
            Text('${Fmt.label(d.flock.type)} · ${Fmt.label(d.stage)}${d.ageDays != null ? ' · day ${d.ageDays}' : ''}', style: const TextStyle(color: AppColors.inkSoft)),
            const SizedBox(height: 12),
            GlassCard(
              child: Column(children: [
                Row(children: [kv('Alive', Fmt.number(d.alive)), kv('Survival', Fmt.percent(d.survivalRate)), kv('Deaths', Fmt.number(d.mortality))]),
                const SizedBox(height: 14),
                Row(children: [kv('Avg weight', d.averageWeightG == null ? '—' : '${Fmt.number(d.averageWeightG)} g'), kv('Daily gain', d.dailyWeightGainG == null ? '—' : '${Fmt.number(d.dailyWeightGainG, digits: 1)} g'),
                  // Layers: feed per dozen eggs; meat birds: FCR at the last weigh-in.
                  if (d.flock.isLaying) kv('Feed / dozen', d.feedPerDozenEggsKg == null ? '—' : '${d.feedPerDozenEggsKg!.toStringAsFixed(2)} kg') else kv(d.fcrAsOf == null ? 'FCR' : 'FCR (${Fmt.shortDate(d.fcrAsOf)})', d.fcr == null ? '—' : '${d.fcr!.toStringAsFixed(2)}${d.fcrWarning != null ? ' ⚠' : ''}')]),
                if (d.flock.isLaying && d.eggsPerHenHoused != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${d.eggsPerHenHoused!.toStringAsFixed(1)} eggs per hen housed', style: const TextStyle(color: AppColors.inkSoft))),
                if (!d.flock.isLaying && d.epef != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('EPEF ${d.epef}', style: const TextStyle(color: AppColors.inkSoft))),
                if (d.fcrNote != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(d.fcrNote!, style: const TextStyle(color: AppColors.amberInk))),
                const SizedBox(height: 14),
                Row(children: [kv('Feed used', '${Fmt.number(d.feedConsumedKg)} kg'), kv('Feed / bird', d.feedPerBirdKg == null ? '—' : '${Fmt.number(d.feedPerBirdKg, digits: 2)} kg'), kv('Eggs', Fmt.number(d.eggsCollected))]),
              ]),
            ),
            const SizedBox(height: 12),
            GlassCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Weigh-ins', style: Theme.of(context).textTheme.titleMedium),
                if (weighIns.isEmpty) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Not weighed yet.', style: TextStyle(color: AppColors.inkSoft))),
                for (final w in weighIns.take(10))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('${Fmt.number(w.averageWeightG)} g'),
                    subtitle: Text('${w.sampleSize ?? '?'} birds${w.uniformityPercent != null ? ' · ${Fmt.percent(w.uniformityPercent, digits: 0)} uniform' : ''}'),
                    trailing: Text(Fmt.shortDate(w.date)),
                  ),
              ]),
            ),
            if (canRecord) ...[
              const SizedBox(height: 16),
              SizedBox(height: kTarget, child: FilledButton.icon(onPressed: () => context.go('${Routes.entry}?flock=${d.flock.id}'), icon: const Icon(Icons.edit_note), label: const Text('Record for this flock'))),
            ],
          ]);
        },
      ),
    );
  }
}
