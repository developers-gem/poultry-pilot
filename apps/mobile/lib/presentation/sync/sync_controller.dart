import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/connectivity/connectivity.dart';
import '../../core/providers.dart';
import '../../core/sync/uuid.dart';
import '../../data/sync/sync_engine.dart';
import '../../data/sync/sync_queue.dart';
import '../session/session_controller.dart';

/// What the status bar shows: Offline, Syncing, Synced, Sync failed (plus what needs the farmer).
enum SyncPhase { offline, syncing, synced, waiting, failed, conflict, needsSignIn }

class SyncViewState {
  const SyncViewState({this.online = true, this.running = false, this.pending = 0, this.failed = 0, this.conflicts = 0, this.otherAccounts = 0, this.lastSyncedAt, this.lastOutcome, this.message});

  final bool online;
  final bool running;
  final int pending;
  final int failed;
  final int conflicts;

  /// Changes another person made on this phone: kept, sent when they sign in.
  final int otherAccounts;
  final DateTime? lastSyncedAt;
  final SyncOutcome? lastOutcome;
  final String? message;

  int get unsent => pending + failed + conflicts;

  SyncPhase get phase {
    if (!online) return SyncPhase.offline;
    if (running) return SyncPhase.syncing;
    if (lastOutcome == SyncOutcome.needsSignIn) return SyncPhase.needsSignIn;
    if (conflicts > 0) return SyncPhase.conflict;
    if (failed > 0 || lastOutcome == SyncOutcome.failed) return SyncPhase.failed;
    if (pending > 0) return SyncPhase.waiting;
    return SyncPhase.synced;
  }

  SyncViewState copyWith({bool? online, bool? running, int? pending, int? failed, int? conflicts, int? otherAccounts, DateTime? lastSyncedAt, SyncOutcome? lastOutcome, String? message}) => SyncViewState(
        online: online ?? this.online,
        running: running ?? this.running,
        pending: pending ?? this.pending,
        failed: failed ?? this.failed,
        conflicts: conflicts ?? this.conflicts,
        otherAccounts: otherAccounts ?? this.otherAccounts,
        lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
        lastOutcome: lastOutcome ?? this.lastOutcome,
        message: message,
      );
}

/// Runs the sync engine at the right moments and exposes its state to the screens.
class SyncController extends Notifier<SyncViewState> {
  Timer? _timer;

  @override
  SyncViewState build() {
    ref.listen<AsyncValue<bool>>(isOnlineProvider, (prev, next) {
      final online = next.valueOrNull ?? true;
      state = state.copyWith(online: online);
      if (online && prev?.valueOrNull != true) syncNow();
    });
    // Deferred: a provider may not change other providers (or its own state) while it is being built.
    ref.listen(sessionProvider, (_, next) {
      Future.microtask(() {
        final user = next is SessionSignedIn ? next.account.user.id : null;
        ref.read(syncUserProvider.notifier).state = user;
        if (user != null) startUp().then((_) => syncNow());
      });
    }, fireImmediately: true);
    _timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (state.online && state.pending > 0) syncNow();
    });
    ref.onDispose(() => _timer?.cancel());
    return SyncViewState(online: ref.read(isOnlineProvider).valueOrNull ?? true);
  }

  String? get _user => ref.read(syncUserProvider);

  /// Counts from the queue (also used after every local change).
  Future<void> refreshCounts() async {
    final user = _user;
    if (user == null) return;
    final all = await ref.read(syncQueueProvider).list(statuses: OpStatus.unsynced);
    final mine = all.where((o) => o.userId == user);
    state = state.copyWith(
      pending: mine.where((o) => o.status == OpStatus.pending || o.status == OpStatus.syncing).length,
      failed: mine.where((o) => o.status == OpStatus.failed).length,
      conflicts: mine.where((o) => o.status == OpStatus.conflict).length,
      otherAccounts: all.length - mine.length,
      lastOutcome: state.lastOutcome,
    );
  }

  /// A change was saved on the phone: count it, and send it now if possible.
  Future<void> changed() async {
    await refreshCounts();
    if (state.online) await syncNow();
  }

  /// One-time start-up work: move legacy outbox entries into the queue.
  Future<void> startUp() async {
    final user = _user;
    if (user == null) return;
    final queue = ref.read(syncQueueProvider);
    await ref.read(databaseProvider).migrateLegacyOutbox(userId: user, nextSeq: queue.nextSeqForMigration, newId: newUuid);
    await refreshCounts();
  }

  Future<SyncReport?> syncNow() async {
    final user = _user;
    if (user == null) return null;
    state = state.copyWith(running: true);
    try {
      final farmId = ref.read(sessionProvider).farm?.farmId;
      final report = await ref.read(syncEngineProvider).run(userId: user, currentFarmId: farmId);
      // Nothing to send but online: still refresh the local copy now and then (opening the app).
      if (report.outcome == SyncOutcome.nothingToDo && farmId != null && state.lastSyncedAt == null) {
        await ref.read(localRefresherProvider).refresh(farmId, userId: user).catchError((_) {});
      }
      final ok = report.outcome == SyncOutcome.synced || report.outcome == SyncOutcome.nothingToDo;
      state = state.copyWith(running: false, lastOutcome: report.outcome, lastSyncedAt: ok ? DateTime.now() : null, message: report.message);
      if (report.outcome == SyncOutcome.offline) state = state.copyWith(online: false);
      await refreshCounts();
      return report;
    } catch (e) {
      state = state.copyWith(running: false, lastOutcome: SyncOutcome.failed, message: '$e');
      await refreshCounts();
      return null;
    }
  }

  Future<void> retry(String opId) async {
    await ref.read(syncEngineProvider).retry(opId);
    await changed();
  }

  Future<void> keepMine(String opId) async {
    await ref.read(syncEngineProvider).keepMine(opId);
    await changed();
  }

  Future<void> discard(String opId) async {
    await ref.read(syncEngineProvider).discard(opId);
    await refreshCounts();
  }
}

final syncControllerProvider = NotifierProvider<SyncController, SyncViewState>(SyncController.new);

/// The queue for the Sync screen (refreshed whenever the controller's state changes).
final syncQueueListProvider = FutureProvider.autoDispose<List<SyncOp>>((ref) {
  ref.watch(syncControllerProvider);
  return ref.watch(syncQueueProvider).list();
});
