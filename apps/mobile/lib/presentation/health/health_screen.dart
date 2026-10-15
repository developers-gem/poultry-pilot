import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/daily_entry.dart';
import '../../domain/entities/farm_work.dart';
import '../dashboard/dashboard_view_model.dart';
import '../entry/entry_sheets.dart';
import '../session/session_controller.dart';

final _healthProvider = FutureProvider.autoDispose<(List<VaccinationItem>, List<HealthRecordItem>, List<FlockSummary>)>((ref) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  final repo = ref.watch(farmWorkRepositoryProvider);
  final results = await Future.wait([repo.vaccinations(farmId), repo.healthRecords(farmId), repo.flocks(farmId).then((c) => c.data)]);
  return (results[0] as List<VaccinationItem>, results[1] as List<HealthRecordItem>, results[2] as List<FlockSummary>);
});

/// Health: vaccinations due (mark as given in two taps), report a problem with symptom chips, recent records.
class HealthScreen extends ConsumerWidget {
  const HealthScreen({super.key});

  /// Today on the farm (from the dashboard, which uses the farm's time zone); the phone's date as a fallback.
  String _today(WidgetRef ref) {
    final farmId = ref.read(sessionProvider).farm?.farmId;
    return (farmId == null ? null : ref.read(dashboardProvider(farmId)).valueOrNull?.data.date) ?? DateTime.now().toIso8601String().substring(0, 10);
  }

  Future<void> _report(BuildContext context, WidgetRef ref, List<FlockSummary> flocks) async {
    if (flocks.isEmpty) return;
    var flockId = flocks.first.id;
    final picked = <String>{};
    num affected = 1;
    final ok = await showEntrySheet<bool>(context, title: 'Report a health problem', done: 'Report', onDone: () => picked.isNotEmpty, builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (flocks.length > 1)
            Wrap(spacing: 8, runSpacing: 8, children: [for (final f in flocks) ChoiceChip(label: Text(f.flockCode), selected: flockId == f.id, onSelected: (_) => set(() => flockId = f.id))]),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (final s in commonSigns)
              FilterChip(label: Text(s, style: const TextStyle(fontSize: 15)), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10), selected: picked.contains(s), onSelected: (on) => set(() => on ? picked.add(s) : picked.remove(s))),
          ]),
          BigStepper(label: 'Birds affected', value: affected, min: 1, format: (v) => '${v.toInt()}', onChanged: (v) => set(() => affected = v)),
        ]));
    if (ok != true) return;
    try {
      final farmId = ref.read(sessionProvider).farm!.farmId;
      await ref.read(farmWorkRepositoryProvider).reportProblem(farmId, flockId: flockId, date: _today(ref), title: picked.join(', '), symptoms: picked.toList(), affectedBirds: affected.toInt());
      ref.invalidate(_healthProvider);
      if (context.mounted) showMessage(context, 'Reported. Your manager and vet can see it.');
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final farm = ref.watch(sessionProvider).farm;
    final async = ref.watch(_healthProvider);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(_healthProvider.future),
      child: ListView(padding: const EdgeInsets.all(16), physics: const AlwaysScrollableScrollPhysics(), children: [
        const Eyebrow('Health'),
        Text('Flock health', style: Theme.of(context).textTheme.headlineSmall),
        const Text('PoultryPilot records what you see; your vet makes the diagnosis.', style: TextStyle(color: AppColors.inkSoft)),
        const SizedBox(height: 12),
        ...async.when<List<Widget>>(
          loading: () => const [SkeletonList()],
          error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(_healthProvider))],
          data: (r) {
            final (vacc, records, flocks) = r;
            final code = {for (final f in flocks) f.id: f.flockCode};
            final due = vacc.where((v) => v.state != 'done' && v.state != 'skipped').toList();
            return [
              if (farm?.can('health.record_observation') ?? false)
                SizedBox(height: kTarget, child: FilledButton.icon(onPressed: () => _report(context, ref, flocks), icon: const Icon(Icons.report_outlined), label: const Text('Report a problem', style: TextStyle(fontSize: 17)))),
              const SizedBox(height: 12),
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Vaccinations due', style: Theme.of(context).textTheme.titleMedium),
                  if (due.isEmpty) const Padding(padding: EdgeInsets.only(top: 8), child: Text('Nothing due.', style: TextStyle(color: AppColors.inkSoft))),
                  for (final v in due)
                    ListTile(
                      minTileHeight: kTarget,
                      contentPadding: EdgeInsets.zero,
                      title: Text('${v.vaccineName} · ${code[v.flockId] ?? ''}'),
                      subtitle: Text(v.state == 'overdue' ? 'Overdue since ${Fmt.shortDate(v.dueDate)}' : 'Due ${Fmt.shortDate(v.dueDate)}', style: TextStyle(color: v.state == 'overdue' ? AppColors.roseInk : AppColors.inkSoft)),
                      trailing: (farm?.can('health.vaccinate') ?? false)
                          ? FilledButton.tonal(
                              style: FilledButton.styleFrom(minimumSize: const Size(96, 48)),
                              onPressed: () async {
                                try {
                                  await ref.read(farmWorkRepositoryProvider).markVaccinated(farm!.farmId, v.id, date: _today(ref));
                                  ref.invalidate(_healthProvider);
                                  if (context.mounted) showMessage(context, '${v.vaccineName} recorded as given');
                                } catch (e) {
                                  if (context.mounted) showError(context, e);
                                }
                              },
                              child: const Text('Given'),
                            )
                          : null,
                    ),
                ]),
              ),
              const SizedBox(height: 12),
              GlassCard(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Recent records', style: Theme.of(context).textTheme.titleMedium),
                  if (records.isEmpty) const Padding(padding: EdgeInsets.only(top: 8), child: Text('No health records yet.', style: TextStyle(color: AppColors.inkSoft))),
                  for (final h in records.take(15))
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(h.type == 'observation' ? Icons.visibility_outlined : Icons.medical_services_outlined, color: AppColors.brandInk),
                      title: Text(h.title),
                      subtitle: Text('${Fmt.label(h.type)}${h.flockId != null ? ' · ${code[h.flockId] ?? ''}' : ''}${h.affectedBirds != null ? ' · ${h.affectedBirds} birds' : ''}'),
                      trailing: Text(Fmt.shortDate(h.date)),
                    ),
                ]),
              ),
            ];
          },
        ),
      ]),
    );
  }
}
