import 'dart:convert';

import 'package:drift/drift.dart';

import '../../core/database/app_database.dart';
import '../../core/sync/uuid.dart';

/// The states a queued change goes through.
class OpStatus {
  const OpStatus._();
  static const pending = 'pending';
  static const syncing = 'syncing';
  static const synced = 'synced';
  static const failed = 'failed';
  static const conflict = 'conflict';

  /// Not yet on the server (the farmer's data lives only on this phone).
  static const unsynced = [pending, syncing, failed, conflict];
}

/// A change waiting for (or done with) the server.
class SyncOp {
  SyncOp(this.row, this.photos);

  final SyncOpRow row;
  final List<SyncPhotoRow> photos;

  String get id => row.id;
  String get command => row.command;
  String get status => row.status;
  String get farmId => row.farmId;
  String get userId => row.userId;
  String get entityKey => row.entityKey;
  Map<String, dynamic> get payload => (jsonDecode(row.payloadJson) as Map).cast<String, dynamic>();
  Map<String, dynamic> get snapshot => row.baseSnapshotJson == null ? <String, dynamic>{} : (jsonDecode(row.baseSnapshotJson!) as Map).cast<String, dynamic>();
  Map<String, dynamic>? get server => row.serverJson == null ? null : (jsonDecode(row.serverJson!) as Map).cast<String, dynamic>();
}

/// The sync queue on the device (Drift). Changes are written here first, always; the engine sends them.
class SyncQueue {
  SyncQueue(this.db);

  final AppDatabase db;

  Future<int> _nextSeq() async {
    final max = db.syncOps.seq.max();
    final row = await (db.selectOnly(db.syncOps)..addColumns([max])).getSingle();
    return (row.read(max) ?? 0) + 1;
  }

  Future<SyncOp?> byId(String id) async {
    final row = await (db.select(db.syncOps)..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : SyncOp(row, await photosOf(id));
  }

  Future<List<SyncPhotoRow>> photosOf(String opId) => (db.select(db.syncOpPhotos)..where((t) => t.opId.equals(opId))).get();

  /// Queues a change. A day change made while an earlier one for the same day has not started sending is merged
  /// into it (later values win; the first base values are kept). Made while the earlier one is being sent, it is
  /// chained after it.
  Future<SyncOp> enqueue({
    required String userId,
    required String farmId,
    required String command,
    required String entityKey,
    required Map<String, dynamic> payload,
    int? baseVersion,
    Map<String, dynamic>? baseSnapshot,
    List<String> photoFiles = const [],
  }) async {
    return db.transaction(() async {
      final earlier = await (db.select(db.syncOps)
            ..where((t) => t.userId.equals(userId) & t.entityKey.equals(entityKey) & t.status.isIn(OpStatus.unsynced))
            ..orderBy([(t) => OrderingTerm.desc(t.seq)]))
          .get();
      final now = DateTime.now();
      final last = earlier.firstOrNull;
      if (command == 'daily_record.patch' && last != null && last.command == command && last.status == OpStatus.pending) {
        final merged = (jsonDecode(last.payloadJson) as Map).cast<String, dynamic>();
        final patch = (merged['patch'] as Map).cast<String, dynamic>()..addAll((payload['patch'] as Map).cast<String, dynamic>());
        merged['patch'] = patch;
        final snap = last.baseSnapshotJson == null ? <String, dynamic>{} : (jsonDecode(last.baseSnapshotJson!) as Map).cast<String, dynamic>();
        for (final e in (baseSnapshot ?? const {}).entries) {
          snap.putIfAbsent(e.key, () => e.value);
        }
        await (db.update(db.syncOps)..where((t) => t.id.equals(last.id))).write(SyncOpsCompanion(payloadJson: Value(jsonEncode(merged)), baseSnapshotJson: Value(jsonEncode(snap)), updatedAt: Value(now)));
        for (final f in photoFiles) {
          await db.into(db.syncOpPhotos).insert(SyncOpPhotosCompanion.insert(opId: last.id, filePath: f));
        }
        return (await byId(last.id))!;
      }
      final id = newUuid();
      await db.into(db.syncOps).insert(SyncOpsCompanion.insert(
        id: id,
        seq: await _nextSeq(),
        userId: userId,
        farmId: farmId,
        command: command,
        entityKey: entityKey,
        payloadJson: jsonEncode(payload),
        baseVersion: Value(last == null ? baseVersion : null),
        chained: Value(last != null),
        baseSnapshotJson: Value(baseSnapshot == null ? null : jsonEncode(baseSnapshot)),
        createdAt: now,
        updatedAt: now,
      ));
      for (final f in photoFiles) {
        await db.into(db.syncOpPhotos).insert(SyncOpPhotosCompanion.insert(opId: id, filePath: f));
      }
      return (await byId(id))!;
    });
  }

  /// Changes in creation order, optionally for one person, farm and/or set of statuses.
  Future<List<SyncOp>> list({String? userId, String? farmId, List<String>? statuses, String? entityKeyPrefix}) async {
    final q = db.select(db.syncOps)..orderBy([(t) => OrderingTerm.asc(t.seq)]);
    q.where((t) {
      Expression<bool> e = const Constant(true);
      if (userId != null) e = e & t.userId.equals(userId);
      if (farmId != null) e = e & t.farmId.equals(farmId);
      if (statuses != null) e = e & t.status.isIn(statuses);
      if (entityKeyPrefix != null) e = e & t.entityKey.like('$entityKeyPrefix%');
      return e;
    });
    final rows = await q.get();
    return [for (final r in rows) SyncOp(r, await photosOf(r.id))];
  }

  Future<void> setStatus(String id, String status, {String? errorCode, String? lastError, Map<String, dynamic>? server, bool countAttempt = false, bool clearError = false}) async {
    final op = await byId(id);
    if (op == null) return;
    await (db.update(db.syncOps)..where((t) => t.id.equals(id))).write(SyncOpsCompanion(
      status: Value(status),
      attempts: countAttempt ? Value(op.row.attempts + 1) : const Value.absent(),
      errorCode: clearError ? const Value(null) : (errorCode == null ? const Value.absent() : Value(errorCode)),
      lastError: clearError ? const Value(null) : (lastError == null ? const Value.absent() : Value(lastError)),
      serverJson: server == null ? const Value.absent() : Value(jsonEncode(server)),
      updatedAt: Value(DateTime.now()),
      syncedAt: status == OpStatus.synced ? Value(DateTime.now()) : const Value.absent(),
    ));
  }

  Future<void> markMany(List<String> ids, String status) => (db.update(db.syncOps)..where((t) => t.id.isIn(ids))).write(SyncOpsCompanion(status: Value(status), updatedAt: Value(DateTime.now())));

  /// After a conflict that merges cleanly, or when the farmer keeps their version: resend on the server's version.
  Future<void> rebase(String id, {required int? baseVersion, required Map<String, dynamic> snapshot}) => (db.update(db.syncOps)..where((t) => t.id.equals(id))).write(SyncOpsCompanion(
        status: const Value(OpStatus.pending),
        baseVersion: Value(baseVersion),
        chained: const Value(false),
        baseSnapshotJson: Value(jsonEncode(snapshot)),
        errorCode: const Value(null),
        lastError: const Value(null),
        updatedAt: Value(DateTime.now()),
      ));

  Future<void> setBaseVersion(String id, int? version) => (db.update(db.syncOps)..where((t) => t.id.equals(id))).write(SyncOpsCompanion(baseVersion: Value(version), chained: const Value(false)));

  Future<void> setPhotoAsset(int photoId, String assetId) => (db.update(db.syncOpPhotos)..where((t) => t.id.equals(photoId))).write(SyncOpPhotosCompanion(assetId: Value(assetId)));

  /// Only when the farmer discards a change (or it synced long ago). Returns the photo copies to delete.
  Future<List<String>> remove(String id) async {
    final files = (await photosOf(id)).map((p) => p.filePath).toList();
    await (db.delete(db.syncOpPhotos)..where((t) => t.opId.equals(id))).go();
    await (db.delete(db.syncOps)..where((t) => t.id.equals(id))).go();
    return files;
  }

  /// Changes left "syncing" by an app that was closed mid-request go back to pending (the server de-duplicates
  /// the resend by mutation id, so nothing is applied twice).
  Future<int> recoverInterrupted() => (db.update(db.syncOps)..where((t) => t.status.equals(OpStatus.syncing))).write(SyncOpsCompanion(status: const Value(OpStatus.pending), updatedAt: Value(DateTime.now())));

  /// Synced changes are kept a week (shown as "Synced"), then removed.
  Future<int> pruneSynced({Duration keep = const Duration(days: 7)}) async {
    final old = await (db.select(db.syncOps)..where((t) => t.status.equals(OpStatus.synced) & t.syncedAt.isSmallerThanValue(DateTime.now().subtract(keep)))).get();
    for (final r in old) {
      await (db.delete(db.syncOpPhotos)..where((t) => t.opId.equals(r.id))).go();
      await (db.delete(db.syncOps)..where((t) => t.id.equals(r.id))).go();
    }
    return old.length;
  }

  Future<int> nextSeqForMigration() => _nextSeq();
}
