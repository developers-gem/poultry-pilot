import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/providers.dart';
import '../../core/router/app_router.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../data/sync/sync_queue.dart';
import '../entry/entry_sheets.dart';
import '../session/session_controller.dart';
import 'sync_controller.dart';

/// Offline · Syncing · Synced · Sync failed: always visible at the top of the signed-in screens; tap for details.
class SyncStatusBar extends ConsumerWidget {
  const SyncStatusBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(syncControllerProvider);
    final waiting = s.unsent > 0 ? ' · ${s.unsent} not sent' : '';
    final (icon, text, bg, fg) = switch (s.phase) {
      SyncPhase.offline => (Icons.cloud_off, 'Offline$waiting', AppColors.amber, AppColors.amberInk),
      SyncPhase.syncing => (Icons.sync, 'Syncing…', AppColors.brand, AppColors.brandInk),
      SyncPhase.synced => (Icons.cloud_done_outlined, s.lastSyncedAt == null ? 'Synced' : 'Synced ${Fmt.dateTime(s.lastSyncedAt!.toIso8601String())}', AppColors.mint, AppColors.mintInk),
      SyncPhase.waiting => (Icons.cloud_upload_outlined, '${s.pending} waiting to sync', AppColors.cyan, AppColors.cyanInk),
      SyncPhase.failed => (Icons.error_outline, 'Sync failed$waiting', AppColors.rose, AppColors.roseInk),
      SyncPhase.conflict => (Icons.call_split, 'Sync failed · ${s.conflicts} need${s.conflicts == 1 ? 's' : ''} your decision', AppColors.rose, AppColors.roseInk),
      SyncPhase.needsSignIn => (Icons.lock_outline, 'Sync failed · sign in again to send', AppColors.rose, AppColors.roseInk),
    };
    return Semantics(
      button: true,
      liveRegion: true,
      label: text,
      child: Material(
        color: bg.withValues(alpha: 0.16),
        child: InkWell(
          onTap: () => context.go(Routes.sync),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 40),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(children: [
                Icon(icon, size: 18, color: fg),
                const SizedBox(width: 8),
                Expanded(child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.w600))),
                if (s.phase != SyncPhase.syncing && s.online && s.unsent > 0) Text('Sync now', style: TextStyle(color: fg, decoration: TextDecoration.underline)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Every change on this phone and where it stands, with what the farmer can do about each.
class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  static String describe(SyncOp op) {
    final p = op.payload;
    switch (op.command) {
      case 'daily_record.patch':
        final sections = ((p['patch'] as Map?)?.keys ?? const <String>[]).map((k) => Fmt.label(k.toString().replaceAll('healthObservations', 'health').replaceAll('averageWeight', 'weight').replaceAll('waterLitres', 'water'))).join(', ');
        return 'Daily record ${Fmt.shortDate(p['date'] as String?)}: $sections${op.photos.isNotEmpty ? ' + ${op.photos.length} photo${op.photos.length == 1 ? '' : 's'}' : ''}';
      case 'task.complete':
        return 'Task finished';
      case 'health.record':
        return 'Health: ${p['title']}';
      case 'vaccination.administer':
        return 'Vaccination given ${Fmt.shortDate(p['date'] as String?)}';
      default:
        return Fmt.label(op.command.replaceAll('.', ' '));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(syncControllerProvider);
    final ctrl = ref.read(syncControllerProvider.notifier);
    final user = ref.watch(syncUserProvider);
    final async = ref.watch(syncQueueListProvider);

    Future<void> confirmDiscard(SyncOp op, String what) async {
      final ok = await showDialog<bool>(
        context: context,
        builder: (c) => AlertDialog(
          title: Text(what),
          content: Text('"${describe(op)}" will be removed from this phone and never sent. This cannot be undone.'),
          actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Keep it')), FilledButton(style: FilledButton.styleFrom(backgroundColor: AppColors.roseInk), onPressed: () => Navigator.pop(c, true), child: const Text('Remove'))],
        ),
      );
      if (ok == true) await ctrl.discard(op.id);
    }

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(switch (s.phase) { SyncPhase.offline => 'Offline', SyncPhase.syncing => 'Syncing…', SyncPhase.synced => 'Synced', SyncPhase.waiting => 'Waiting to sync', _ => 'Sync failed' }, style: Theme.of(context).textTheme.headlineSmall),
      Text(
        s.phase == SyncPhase.needsSignIn
            ? 'Your session ended. Sign in again to send your changes: they are safe on this phone.'
            : s.online
                ? (s.lastSyncedAt == null ? 'Your changes are sent as soon as possible.' : 'Last synced ${Fmt.dateTime(s.lastSyncedAt!.toIso8601String())}.')
                : 'Keep working: everything is saved on this phone and sent when you are back online.',
        style: const TextStyle(color: AppColors.inkSoft),
      ),
      if (s.message != null && s.phase == SyncPhase.failed) Padding(padding: const EdgeInsets.only(top: 6), child: Text(s.message!, style: const TextStyle(color: AppColors.roseInk))),
      const SizedBox(height: 12),
      if (s.phase == SyncPhase.needsSignIn)
        SizedBox(height: kTarget, child: FilledButton(onPressed: () => ref.read(sessionProvider.notifier).logout(), child: const Text('Sign in again')))
      else
        SizedBox(height: kTarget, child: FilledButton.icon(onPressed: s.online && !s.running ? () => ctrl.syncNow() : null, icon: const Icon(Icons.sync), label: Text(s.running ? 'Syncing…' : 'Sync now'))),
      const SizedBox(height: 16),
      ...async.when<List<Widget>>(
        loading: () => const [LoadingView()],
        error: (e, _) => [ErrorView(error: e)],
        data: (ops) {
          final mine = ops.where((o) => o.userId == user).toList();
          final others = ops.where((o) => o.userId != user && o.status != OpStatus.synced).toList();
          Widget group(String title, List<SyncOp> list, Widget? Function(SyncOp) actions, {Color? color}) => list.isEmpty
              ? const SizedBox.shrink()
              : Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: GlassCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('$title (${list.length})', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color)),
                      for (final op in list.reversed.take(30))
                        Padding(
                          padding: const EdgeInsets.only(top: 10),
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(describe(op), style: const TextStyle(fontWeight: FontWeight.w600)),
                            Text('Saved ${Fmt.dateTime(op.row.createdAt.toIso8601String())}${op.row.attempts > 0 ? ' · ${op.row.attempts} attempt${op.row.attempts == 1 ? '' : 's'}' : ''}${op.row.lastError != null && op.status != OpStatus.synced ? '\n${op.row.lastError}' : ''}', style: const TextStyle(color: AppColors.inkSoft, fontSize: 12)),
                            if (actions(op) case final a?) a,
                          ]),
                        ),
                    ]),
                  ),
                );
          return [
            group('Needs your decision', mine.where((o) => o.status == OpStatus.conflict).toList(), (op) => Wrap(spacing: 8, children: [
                  TextButton(onPressed: () => ctrl.keepMine(op.id), child: const Text('Keep mine')),
                  TextButton(onPressed: () => confirmDiscard(op, "Use the server's version?"), child: const Text("Use the server's")),
                  if (op.server != null) TextButton(onPressed: () => _showServer(context, op), child: const Text('See what changed')),
                ]), color: AppColors.roseInk),
            group('Not accepted', mine.where((o) => o.status == OpStatus.failed).toList(), (op) => Wrap(spacing: 8, children: [
                  TextButton(onPressed: () => ctrl.retry(op.id), child: const Text('Try again')),
                  TextButton(onPressed: () => confirmDiscard(op, 'Remove this change?'), child: const Text('Remove')),
                ]), color: AppColors.roseInk),
            group('Waiting to sync', mine.where((o) => o.status == OpStatus.pending || o.status == OpStatus.syncing).toList(), (_) => null),
            group('Synced (last 7 days)', mine.where((o) => o.status == OpStatus.synced).toList(), (_) => null, color: AppColors.mintInk),
            if (others.isNotEmpty) group('From another account on this phone', others, (_) => const Text('Sent when that person signs in on this phone.', style: TextStyle(color: AppColors.inkSoft))),
            if (mine.isEmpty && others.isEmpty) const EmptyView(title: 'Nothing waiting.', body: 'Everything you recorded is on the server.'),
          ];
        },
      ),
    ]);
  }

  static void _showServer(BuildContext context, SyncOp op) {
    final server = op.server ?? const {};
    final mine = (op.payload['patch'] as Map?) ?? op.payload;
    String show(Object? v) => const JsonEncoder.withIndent('  ').convert(v);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (c) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Your change', style: TextStyle(fontWeight: FontWeight.w700)),
            Text(show(mine), style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
            const SizedBox(height: 12),
            const Text('On the server now', style: TextStyle(fontWeight: FontWeight.w700)),
            Text(show({for (final k in mine.keys) k: server[k] ?? (k == 'eggs' ? server['eggs'] : null)}), style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
          ]),
        ),
      ),
    );
  }
}
