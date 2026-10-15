import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/farm_work.dart';
import '../dashboard/dashboard_view_model.dart';
import '../entry/entry_sheets.dart';
import '../session/session_controller.dart';
import '../sync/sync_controller.dart';

String _userOf(Ref ref) {
  final s = ref.watch(sessionProvider);
  return s is SessionSignedIn ? s.account.user.id : '';
}

final _todayProvider = FutureProvider.autoDispose<TodayWork>((ref) async {
  ref.watch(syncControllerProvider.select((s) => s.unsent)); // refresh as changes are sent
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  return ref.watch(farmWorkRepositoryProvider).today(farmId, userId: _userOf(ref));
});

final _allTasksProvider = FutureProvider.autoDispose<List<TaskItem>>((ref) async {
  ref.watch(syncControllerProvider.select((s) => s.unsent));
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId))!;
  return ref.watch(farmWorkRepositoryProvider).tasks(farmId, userId: _userOf(ref));
});

/// Tasks: today's work (entries still to do, my tasks, scheduled work) and all open tasks.
class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  bool _all = false;

  void _refresh() {
    ref.invalidate(_todayProvider);
    ref.invalidate(_allTasksProvider);
    final farmId = ref.read(sessionProvider).farm?.farmId;
    if (farmId != null) ref.invalidate(dashboardProvider(farmId));
  }

  Future<void> _complete(TaskItem t) async {
    String? notes;
    if (t.needsNotes) {
      final c = TextEditingController();
      notes = await showEntrySheet<String>(context, title: 'What was done?', done: 'Mark done', onDone: () => c.text.trim().isEmpty ? null : c.text.trim(), builder: (ctx, set) => TextField(controller: c, autofocus: true, maxLines: 3, decoration: const InputDecoration(labelText: 'What you did to fix it')));
      if (notes == null) return;
    }
    try {
      final s = ref.read(sessionProvider);
      // Saved on the phone first (works offline); the sync queue sends it.
      await ref.read(farmWorkRepositoryProvider).completeTask(s.farm!.farmId, t.id, userId: s is SessionSignedIn ? s.account.user.id : '', notes: notes);
      _refresh();
      ref.read(syncControllerProvider.notifier).changed();
      if (mounted) showMessage(context, 'Done: ${t.title}');
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _create() async {
    final title = TextEditingController();
    var due = 'today';
    var priority = 'normal';
    final ok = await showEntrySheet<bool>(context, title: 'New task', done: 'Add task', onDone: () => title.text.trim().isNotEmpty, builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(controller: title, autofocus: true, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'What needs doing?')),
          const SizedBox(height: 12),
          const Text('When'),
          Wrap(spacing: 8, children: [for (final d in const ['today', 'tomorrow', 'this week', 'no date']) ChoiceChip(label: Text(Fmt.label(d)), selected: due == d, onSelected: (_) => set(() => due = d))]),
          const SizedBox(height: 8),
          const Text('Priority'),
          Wrap(spacing: 8, children: [for (final p in const ['normal', 'high', 'urgent']) ChoiceChip(label: Text(Fmt.label(p)), selected: priority == p, onSelected: (_) => set(() => priority = p))]),
        ]));
    if (ok != true) return;
    final now = DateTime.now();
    String iso(DateTime d) => d.toIso8601String().substring(0, 10);
    final dueDate = switch (due) { 'today' => iso(now), 'tomorrow' => iso(now.add(const Duration(days: 1))), 'this week' => iso(now.add(Duration(days: 7 - now.weekday))), _ => null };
    try {
      await ref.read(farmWorkRepositoryProvider).createTask(ref.read(sessionProvider).farm!.farmId, title: title.text.trim(), dueDate: dueDate, priority: priority);
      _refresh();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Widget _task(TaskItem t, bool canWork) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: GlassCard(
          padding: const EdgeInsets.fromLTRB(8, 8, 14, 8),
          child: Row(children: [
            SizedBox(
              width: kTarget,
              height: kTarget,
              child: canWork && t.isActive ? IconButton(tooltip: 'Mark done', iconSize: 30, onPressed: () => _complete(t), icon: const Icon(Icons.check_circle_outline, color: AppColors.mintInk)) : Icon(t.isActive ? Icons.circle_outlined : Icons.check_circle, color: AppColors.mintInk),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                Text(
                  [
                    if (t.overdue) 'Overdue' else if (t.dueDate != null) 'Due ${Fmt.shortDate(t.dueDate)}',
                    if (t.flockCode != null) t.flockCode!,
                    if (t.houseName != null) t.houseName!,
                    if (t.assigneeName != null) t.assigneeName!,
                    if (t.kind == 'corrective_action') 'Corrective action',
                    if (t.pendingSync) 'Waiting to sync',
                  ].join(' · '),
                  style: TextStyle(color: t.overdue ? AppColors.roseInk : AppColors.inkSoft),
                ),
              ]),
            ),
            if (t.priority == 'urgent' || t.priority == 'high') Pill(Fmt.label(t.priority), tone: t.priority == 'urgent' ? Tone.rose : Tone.amber),
          ]),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final farm = ref.watch(sessionProvider).farm;
    final canWork = farm?.can('task.complete') ?? false;
    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: (farm?.can('task.manage') ?? false) ? FloatingActionButton.extended(onPressed: _create, icon: const Icon(Icons.add), label: const Text('New task')) : null,
      body: RefreshIndicator(
        onRefresh: () async => _refresh(),
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 96), physics: const AlwaysScrollableScrollPhysics(), children: [
          const Eyebrow('Tasks'),
          Text(_all ? 'All open tasks' : "Today's work", style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 10),
          SegmentedButton<bool>(
            segments: const [ButtonSegment(value: false, label: Text('Today')), ButtonSegment(value: true, label: Text('All tasks'))],
            selected: {_all},
            style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, 48))),
            onSelectionChanged: (s) => setState(() => _all = s.first),
          ),
          const SizedBox(height: 12),
          if (_all)
            ...ref.watch(_allTasksProvider).when<List<Widget>>(
                  loading: () => const [SkeletonList()],
                  error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(_allTasksProvider))],
                  data: (list) => list.isEmpty ? const [EmptyView(title: 'No open tasks.')] : [for (final t in list) _task(t, canWork)],
                )
          else
            ...ref.watch(_todayProvider).when<List<Widget>>(
                  loading: () => const [SkeletonList()],
                  error: (e, _) => [ErrorView(error: e, onRetry: () => ref.invalidate(_todayProvider))],
                  data: (w) => [
                    if (w.dailyEntries.any((e) => !e.recorded)) ...[
                      Text('Daily entries to do', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      for (final e in w.dailyEntries.where((e) => !e.recorded))
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GlassCard(
                            onTap: () => context.go('${Routes.entry}?flock=${e.flockId}'),
                            child: Row(children: [
                              const Icon(Icons.edit_note, color: AppColors.brandInk, size: 28),
                              const SizedBox(width: 10),
                              Expanded(child: Text('${e.flockCode}${e.houseName != null ? ' · ${e.houseName}' : ''}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600))),
                              const Text('Record', style: TextStyle(color: AppColors.brandInk, fontWeight: FontWeight.w600)),
                            ]),
                          ),
                        ),
                      const SizedBox(height: 8),
                    ],
                    Text('My tasks', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 6),
                    if (w.tasks.isEmpty) const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('Nothing due today.', style: TextStyle(color: AppColors.inkSoft))),
                    for (final t in w.tasks) _task(t, canWork),
                    if (w.scheduled.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('Scheduled', style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      for (final e in w.scheduled)
                        ListTile(
                          minTileHeight: kTarget,
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(e.type == 'vaccination_due' ? Icons.vaccines_outlined : Icons.event_outlined, color: e.overdue ? AppColors.roseInk : AppColors.brandInk),
                          title: Text(e.title),
                          subtitle: Text(e.overdue ? 'Overdue since ${Fmt.shortDate(e.date)}' : 'Today', style: TextStyle(color: e.overdue ? AppColors.roseInk : AppColors.inkSoft)),
                        ),
                    ],
                  ],
                ),
        ]),
      ),
    );
  }
}
