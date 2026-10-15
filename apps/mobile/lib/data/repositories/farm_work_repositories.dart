import 'dart:convert';

import '../../core/database/app_database.dart';
import '../../core/error/app_exception.dart';
import '../../domain/entities/daily_entry.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/entities/farm_work.dart';
import '../../domain/repositories/repositories.dart';
import '../datasources/local/cache_store.dart';
import '../datasources/local/photo_store.dart';
import '../datasources/remote/poultrypilot_api.dart';
import '../models/daily_entry_models.dart';
import '../models/farm_work_models.dart';

/// Reads from the API and caches; offline, serves the cached copy (marked as from the cache).
Future<Cached<T>> cachedRead<T>(CacheStore cache, String key, Future<Map<String, dynamic>> Function() fetch, T Function(Map<String, dynamic>) parse) async {
  try {
    final json = await fetch();
    await cache.put(key, json);
    return Cached(parse(json), fromCache: false, savedAt: DateTime.now());
  } on AppException catch (e) {
    final hit = e.isNetwork ? await cache.get(key) : null;
    if (hit == null) rethrow;
    return Cached(parse(hit.json), fromCache: true, savedAt: hit.savedAt);
  }
}

class DailyEntryRepositoryImpl implements DailyEntryRepository {
  DailyEntryRepositoryImpl({required this.api, required this.cache, required this.db, required this.photos});

  final PoultryPilotApi api;
  final CacheStore cache;
  final AppDatabase db;
  final PhotoStore photos;

  @override
  Future<Cached<DailySheet>> sheet(String farmId, String? date) => cachedRead(cache, 'sheet:$farmId:${date ?? 'today'}', () => api.sheetJson(farmId, date), (j) => SheetModel.fromJson(j).toEntity());

  @override
  Future<Cached<DayRecord>> day(String farmId, String flockId, String date) => cachedRead(cache, 'day:$farmId:$flockId:$date', () => api.dayJson(farmId, flockId, date), (j) => DayRecordModel.fromJson(j).toEntity());

  @override
  Future<List<FeedOption>> feedOptions(String farmId) async {
    final c = await cachedRead(cache, 'feed:$farmId', () async => {'items': (await api.feedStock(farmId)).map((i) => i.toJson()).toList()}, (j) => (j['items'] as List).cast<Map<String, dynamic>>().map(FeedStockItemModel.fromJson).toList());
    return c.data.map((i) => FeedOption(itemId: i.itemId, name: i.name, quantityKg: i.quantityKg.toDouble())).toList();
  }

  /// Online: upload photos, then one PATCH. Offline: the entry and copies of the photos wait in the outbox.
  /// A version conflict online is passed to the screen (reload and redo), never queued.
  @override
  Future<SaveOutcome> save({required String farmId, required String flockId, required String date, required Map<String, dynamic> patch, List<String> photoPaths = const []}) async {
    try {
      final body = Map<String, dynamic>.from(patch);
      if (photoPaths.isNotEmpty) {
        final existing = (body.remove('photos') as List?)?.cast<Map<String, dynamic>>() ?? const <Map<String, dynamic>>[];
        final uploaded = <Map<String, dynamic>>[];
        for (final p in photoPaths) {
          uploaded.add({'assetId': (await api.uploadPhoto(farmId, await photos.read(p), photoContentType(p))).id});
        }
        body['photos'] = [...existing, ...uploaded].take(10).toList();
      }
      final saved = await api.patchDay(farmId, flockId, date, body);
      await cache.put('day:$farmId:$flockId:$date', saved.toJson());
      return SaveOutcome.saved;
    } on AppException catch (e) {
      if (!e.isNetwork) rethrow;
      final queued = Map<String, dynamic>.from(patch)..remove('photos');
      final id = await db.addPending(farmId: farmId, flockId: flockId, date: date, patchJson: jsonEncode(queued), baseVersion: patch['version'] as int?);
      for (final p in photoPaths) {
        await db.addPendingPhoto(id, await photos.keep(p));
      }
      return SaveOutcome.queued;
    }
  }

  /// Sends waiting entries in order. Before each, the day is read again: if it changed since the farmer saw it,
  /// the entry is held as a conflict for them to decide (never silently overwrites someone else's work).
  @override
  Future<int> sync() async {
    for (final entry in await db.pendingFor(status: 'waiting')) {
      try {
        final current = DayRecordModel.fromJson(await api.dayJson(entry.farmId, entry.flockId, entry.date));
        if (current.version != entry.baseVersion) {
          await db.setPendingStatus(entry.id, 'conflict', error: 'This day was changed on another device after you saved it.');
          continue;
        }
        final body = (jsonDecode(entry.patchJson) as Map).cast<String, dynamic>();
        final queuedPhotos = await db.photosFor(entry.id);
        if (queuedPhotos.isNotEmpty) {
          final ids = <String>[];
          for (final ph in queuedPhotos) {
            var assetId = ph.assetId;
            if (assetId == null) {
              assetId = (await api.uploadPhoto(entry.farmId, await photos.read(ph.filePath), photoContentType(ph.filePath))).id;
              await db.markPhotoUploaded(ph.id, assetId);
            }
            ids.add(assetId);
          }
          body['photos'] = [...current.photos.map((p) => {'assetId': p.assetId, if (p.caption != null) 'caption': p.caption}), ...ids.map((id) => {'assetId': id})].take(10).toList();
        }
        if (current.version != null) {
          body['version'] = current.version;
        } else {
          body.remove('version');
        }
        await api.patchDay(entry.farmId, entry.flockId, entry.date, body);
        for (final ph in queuedPhotos) {
          await photos.delete(ph.filePath);
        }
        await db.removePending(entry.id);
      } on AppException catch (e) {
        if (e.isNetwork) break; // still offline: try again later
        await db.setPendingStatus(entry.id, e.code == 'VERSION_CONFLICT' ? 'conflict' : 'failed', error: e.userMessage);
      }
    }
    return (await db.pendingFor()).length;
  }

  @override
  Future<List<PendingEntry>> pending(String farmId) async {
    final out = <PendingEntry>[];
    for (final e in await db.pendingFor(farmId: farmId)) {
      final body = (jsonDecode(e.patchJson) as Map).keys.where((k) => k != 'version').cast<String>().toList();
      out.add(PendingEntry(id: e.id, flockId: e.flockId, date: e.date, sections: body, photoCount: (await db.photosFor(e.id)).length, status: e.status, error: e.error));
    }
    return out;
  }

  @override
  Future<void> resolveConflict(int id, {required bool sendAnyway}) async {
    final entry = (await db.pendingFor()).where((e) => e.id == id).firstOrNull;
    if (entry == null) return;
    if (!sendAnyway) {
      for (final ph in await db.photosFor(id)) {
        await photos.delete(ph.filePath);
      }
      await db.removePending(id);
      return;
    }
    // Send on top of the latest version: the farmer chose their entry after seeing the conflict.
    final current = DayRecordModel.fromJson(await api.dayJson(entry.farmId, entry.flockId, entry.date));
    await db.setPendingStatus(id, 'waiting', baseVersion: current.version, setBase: true);
    await sync();
  }
}

class FarmWorkRepositoryImpl implements FarmWorkRepository {
  FarmWorkRepositoryImpl({required this.api, required this.cache});

  final PoultryPilotApi api;
  final CacheStore cache;

  @override
  Future<TodayWork> today(String farmId) async => (await cachedRead(cache, 'today:$farmId', () => api.todayJson(farmId), TodayModel.fromJson)).data.toEntity();

  @override
  Future<List<TaskItem>> tasks(String farmId, {String status = 'active', String assignee = 'any'}) async => (await api.tasks(farmId, status: status, assignee: assignee)).map((t) => t.toEntity()).toList();

  @override
  Future<TaskItem> createTask(String farmId, {required String title, String? dueDate, String priority = 'normal', String? flockId}) async =>
      (await api.createTask(farmId, {'title': title, if (dueDate != null) 'dueDate': dueDate, 'priority': priority, if (flockId != null) 'flockId': flockId})).toEntity();

  @override
  Future<TaskItem> completeTask(String farmId, String taskId, {String? notes}) async => (await api.completeTask(farmId, taskId, notes)).toEntity();

  @override
  Future<TaskItem> startTask(String farmId, String taskId) async => (await api.startTask(farmId, taskId)).toEntity();

  @override
  Future<Cached<List<FlockSummary>>> flocks(String farmId) => cachedRead(cache, 'flocks:$farmId', () => api.flocksJson(farmId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map((f) => FlockModel.fromJson(f).toSummary()).toList());

  @override
  Future<List<HouseItem>> houses(String farmId) async => (await api.houses(farmId)).map((h) => HouseItem(id: h.id, name: h.name, type: h.type)).toList();

  @override
  Future<FlockDetail> flock(String farmId, String flockId) async => (await api.flock(farmId, flockId)).toDetail();

  @override
  Future<List<WeighIn>> weighIns(String farmId, String flockId) async => (await api.weighIns(farmId, flockId)).map((w) => w.toEntity()).toList();

  @override
  Future<Cached<List<TrendDay>>> trends(String farmId, {required String from, required String to, String? flockId}) => cachedRead(
        cache,
        'trends:$farmId:$from:$to:${flockId ?? 'all'}',
        () => api.trendsJson(farmId, from, to, flockId),
        (j) => (j['days'] as List).cast<Map<String, dynamic>>().map((d) => TrendDayModel.fromJson(d).toEntity()).toList(),
      );

  @override
  Future<List<HealthRecordItem>> healthRecords(String farmId) async => (await api.healthRecords(farmId)).map((r) => r.toEntity()).toList();

  @override
  Future<List<VaccinationItem>> vaccinations(String farmId) async => (await api.vaccinations(farmId)).map((v) => VaccinationItem(id: v.id, flockId: v.flockId, vaccineName: v.vaccineName, dueDate: v.dueDate, state: v.state)).toList();

  @override
  Future<void> reportProblem(String farmId, {required String flockId, required String date, required String title, required List<String> symptoms, int? affectedBirds}) =>
      api.createHealthRecord(farmId, {'type': 'observation', 'date': date, 'flockId': flockId, 'title': title, 'symptoms': symptoms.map((s) => s.toLowerCase()).toList(), if (affectedBirds != null) 'affectedBirds': affectedBirds});

  @override
  Future<void> markVaccinated(String farmId, String vaccinationId, {required String date, int? birds}) => api.administerVaccination(farmId, vaccinationId, {'date': date, if (birds != null) 'birdsVaccinated': birds});
}
