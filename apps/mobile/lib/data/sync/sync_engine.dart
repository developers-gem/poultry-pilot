import 'dart:async';

import '../../core/error/app_exception.dart';
import '../../core/network/auth_interceptor.dart';
import '../../core/storage/token_store.dart';
import '../../core/sync/day_merge.dart';
import '../datasources/local/photo_store.dart';
import '../datasources/remote/poultrypilot_api.dart';
import '../models/daily_entry_models.dart';
import 'sync_queue.dart';

/// How a sync run ended.
enum SyncOutcome { synced, nothingToDo, offline, needsSignIn, failed }

class SyncReport {
  const SyncReport(this.outcome, {this.sent = 0, this.pending = 0, this.failed = 0, this.conflicts = 0, this.message});

  final SyncOutcome outcome;
  final int sent;
  final int pending;
  final int failed;
  final int conflicts;
  final String? message;
}

/// Sends the sync queue to the API when there is a connection:
///  1. authenticate (refresh the session; a refused session stops here with everything kept),
///  2. push pending changes in order, in batches per farm (photos uploaded first, each recorded once uploaded),
///  3. take the server's results: accepted → synced, rejected → failed (kept, with the reason),
///  4. resolve conflicts: a day change whose sections are unchanged on the server is resent on the server's
///     version automatically; otherwise it waits for the farmer,
///  5. refresh the local copy of the farm's data.
/// A change is marked "syncing" before it is sent. If the connection or the app dies mid-request, it goes back to
/// pending and is resent with the same mutation id; the server returns the stored result instead of applying it
/// again. Nothing in the queue is ever deleted here except photo copies of synced changes.
class SyncEngine {
  SyncEngine({required this.api, required this.queue, required this.photos, required this.tokens, required this.interceptor, required this.deviceId, this.refresh});

  final PoultryPilotApi api;
  final SyncQueue queue;
  final PhotoStore photos;
  final TokenStore tokens;
  final AuthInterceptor interceptor;
  final Future<String> Function() deviceId;

  /// Step 5: refresh the local copy of this farm's data (best effort).
  final Future<void> Function(String farmId)? refresh;

  Future<SyncReport>? _running;
  bool _recovered = false;
  static const batchSize = 50;
  static const maxRounds = 20;

  /// Runs one sync for [userId] (only their changes are sent). Concurrent calls share the run in progress.
  Future<SyncReport> run({required String userId, String? currentFarmId}) {
    final running = _running;
    if (running != null) return running;
    final f = _run(userId, currentFarmId).whenComplete(() => _running = null);
    _running = f;
    return f;
  }

  Future<SyncReport> _run(String userId, String? currentFarmId) async {
    if (!_recovered) {
      await queue.recoverInterrupted();
      _recovered = true;
    }
    var waiting = await queue.list(userId: userId, statuses: [OpStatus.pending]);
    if (waiting.isEmpty) return _report(userId, SyncOutcome.nothingToDo);

    // 1. Authenticate.
    if (tokens.accessToken == null) {
      final ok = await interceptor.refresh();
      if (!ok) {
        final signedOut = await tokens.readRefreshToken() == null;
        return _report(userId, signedOut ? SyncOutcome.needsSignIn : SyncOutcome.offline);
      }
    }

    final device = await deviceId();
    var sent = 0;
    final touchedFarms = <String>{};
    for (var round = 0; round < maxRounds; round++) {
      final ready = await _ready(userId);
      if (ready.isEmpty) break;
      final farmId = ready.first.farmId;
      final batch = ready.where((o) => o.farmId == farmId).take(batchSize).toList();
      try {
        final mutations = <Map<String, dynamic>>[];
        for (final op in batch) {
          mutations.add(await _mutation(op, farmId));
        }
        // 2. Push (marked syncing first, so a crash mid-request is recovered as pending).
        await queue.markMany(batch.map((o) => o.id).toList(), OpStatus.syncing);
        final results = await api.push(farmId, device, mutations);
        // 3 and 4. Results and conflicts.
        final byId = {for (final r in results) r.mutationId: r};
        for (final op in batch) {
          final r = byId[op.id];
          if (r == null) {
            await queue.setStatus(op.id, OpStatus.pending);
            continue;
          }
          switch (r.status) {
            case 'accepted':
              await queue.setStatus(op.id, OpStatus.synced, server: {'entityId': r.entityId, 'version': r.version}, clearError: true);
              for (final p in op.photos) {
                await photos.delete(p.filePath).catchError((_) {});
              }
              sent++;
              touchedFarms.add(farmId);
            case 'conflict':
              await _resolveConflict(op, r.serverVersion, r.serverDocument);
            default:
              await queue.setStatus(op.id, OpStatus.failed, errorCode: r.code, lastError: r.message ?? 'The server did not accept this change', countAttempt: true);
          }
        }
      } on AppException catch (e) {
        // Nothing of an unanswered batch is assumed: back to pending, resent later with the same mutation ids.
        for (final op in batch) {
          final now = await queue.byId(op.id);
          if (now != null && (now.status == OpStatus.syncing || now.status == OpStatus.pending)) {
            await queue.setStatus(op.id, OpStatus.pending, countAttempt: true, lastError: e.userMessage);
          }
        }
        if (e.isNetwork) return _report(userId, SyncOutcome.offline, sent: sent);
        if (e.isUnauthenticated) return _report(userId, SyncOutcome.needsSignIn, sent: sent);
        return _report(userId, SyncOutcome.failed, sent: sent, message: e.userMessage);
      }
    }

    // 5. Update the local database from the server.
    final refreshFn = refresh;
    if (refreshFn != null) {
      for (final f in {...touchedFarms, if (currentFarmId != null) currentFarmId}) {
        await refreshFn(f).catchError((_) {});
      }
    }
    await queue.pruneSynced();
    return _report(userId, SyncOutcome.synced, sent: sent);
  }

  /// Pending changes whose earlier changes to the same thing have all synced (order per record is kept).
  Future<List<SyncOp>> _ready(String userId) async {
    final all = await queue.list(userId: userId, statuses: OpStatus.unsynced);
    final blocked = <String>{};
    final ready = <SyncOp>[];
    for (final op in all) {
      if (op.status == OpStatus.pending && !blocked.contains(op.entityKey)) ready.add(op);
      blocked.add(op.entityKey);
    }
    return ready;
  }

  /// The mutation to send: photos uploaded first (each recorded as it lands), chained base version filled in.
  Future<Map<String, dynamic>> _mutation(SyncOp op, String farmId) async {
    final payload = op.payload;
    int? baseVersion = op.row.baseVersion;
    if (op.row.chained) {
      final before = (await queue.list(userId: op.userId, statuses: [OpStatus.synced])).where((o) => o.entityKey == op.entityKey && o.row.seq < op.row.seq).toList();
      baseVersion = before.isEmpty ? null : (before.last.server?['version'] as num?)?.toInt();
      await queue.setBaseVersion(op.id, baseVersion);
    }
    if (op.command == 'daily_record.patch' && op.photos.isNotEmpty) {
      final ids = <String>[];
      for (final p in op.photos) {
        var assetId = p.assetId;
        if (assetId == null) {
          assetId = (await api.uploadPhoto(farmId, await photos.read(p.filePath), photoContentType(p.filePath))).id;
          await queue.setPhotoAsset(p.id, assetId);
        }
        ids.add(assetId);
      }
      final base = ((op.snapshot['_photos'] as List?) ?? const []).cast<String>();
      final patch = (payload['patch'] as Map).cast<String, dynamic>();
      patch['photos'] = [...base, ...ids].take(10).map((id) => {'assetId': id}).toList();
      payload['patch'] = patch;
    }
    return {
      'mutationId': op.id,
      'command': op.command,
      'payload': payload,
      if (baseVersion != null) 'baseVersion': baseVersion,
      'clientCreatedAt': op.row.createdAt.toUtc().toIso8601String(),
    };
  }

  /// A day change whose touched sections are unchanged on the server goes again on the server's version;
  /// anything else waits for the farmer (with the server's day kept to show them).
  Future<void> _resolveConflict(SyncOp op, int? serverVersion, Map<String, dynamic>? serverDocument) async {
    if (op.command == 'daily_record.patch' && serverDocument != null) {
      final server = DayRecordModel.fromJson(serverDocument).toEntity();
      final patch = (op.payload['patch'] as Map).cast<String, dynamic>()..remove('photos');
      if (canMergeOnto(server, patch, op.snapshot)) {
        await queue.rebase(op.id, baseVersion: serverVersion, snapshot: {...snapshotOf(server, patch.keys), '_photos': server.photos.map((p) => p.assetId).toList()});
        return;
      }
    }
    await queue.setStatus(op.id, OpStatus.conflict, server: serverDocument ?? {'serverVersion': serverVersion}, lastError: 'Changed on another device after you saved it', countAttempt: true);
  }

  /// The farmer keeps their change: resend it on top of the server's current version.
  Future<void> keepMine(String opId) async {
    final op = await queue.byId(opId);
    if (op == null || op.status != OpStatus.conflict) return;
    final doc = op.server;
    if (op.command == 'daily_record.patch' && doc != null) {
      final server = DayRecordModel.fromJson(doc).toEntity();
      final patch = (op.payload['patch'] as Map).cast<String, dynamic>()..remove('photos');
      await queue.rebase(op.id, baseVersion: server.version, snapshot: {...snapshotOf(server, patch.keys), '_photos': server.photos.map((p) => p.assetId).toList()});
    } else {
      await queue.rebase(op.id, baseVersion: (doc?['version'] as num? ?? doc?['serverVersion'] as num?)?.toInt(), snapshot: op.snapshot);
    }
  }

  /// The farmer chooses the server's version, or discards a refused change: removed, with its photo copies.
  Future<void> discard(String opId) async {
    for (final f in await queue.remove(opId)) {
      await photos.delete(f).catchError((_) {});
    }
  }

  /// Try a refused change again (e.g. after the farm manager fixed a permission).
  Future<void> retry(String opId) => queue.setStatus(opId, OpStatus.pending, clearError: true);

  Future<SyncReport> _report(String userId, SyncOutcome outcome, {int sent = 0, String? message}) async {
    final all = await queue.list(userId: userId, statuses: OpStatus.unsynced);
    return SyncReport(
      outcome,
      sent: sent,
      pending: all.where((o) => o.status == OpStatus.pending || o.status == OpStatus.syncing).length,
      failed: all.where((o) => o.status == OpStatus.failed).length,
      conflicts: all.where((o) => o.status == OpStatus.conflict).length,
      message: message,
    );
  }
}
