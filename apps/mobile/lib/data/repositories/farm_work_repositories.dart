import '../../core/error/app_exception.dart';
import '../../core/sync/day_merge.dart';
import '../../core/sync/uuid.dart';
import '../../domain/entities/daily_entry.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/entities/farm_work.dart';
import '../../domain/repositories/repositories.dart';
import '../datasources/local/cache_store.dart';
import '../datasources/local/photo_store.dart';
import '../datasources/remote/poultrypilot_api.dart';
import '../models/daily_entry_models.dart';
import '../models/farm_work_models.dart';
import '../sync/sync_queue.dart';

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

String dayKey(String flockId, String date) => 'day:$flockId:$date';

/// Offline-first daily records: saving writes to the sync queue; reading shows unsent changes on top.
class DailyEntryRepositoryImpl implements DailyEntryRepository {
  DailyEntryRepositoryImpl({required this.api, required this.cache, required this.queue, required this.photos});

  final PoultryPilotApi api;
  final CacheStore cache;
  final SyncQueue queue;
  final PhotoStore photos;

  Future<List<SyncOp>> _unsentDays(String farmId) => queue.list(farmId: farmId, statuses: OpStatus.unsynced, entityKeyPrefix: 'day:');

  @override
  Future<Cached<DailySheet>> sheet(String farmId, String? date) async {
    final c = await cachedRead(cache, 'sheet:$farmId:${date ?? 'today'}', () => api.sheetJson(farmId, date), (j) => SheetModel.fromJson(j).toEntity());
    final unsent = await _unsentDays(farmId);
    final sheet = c.data;
    final flocks = sheet.flocks.map((f) => unsent.any((o) => o.entityKey == dayKey(f.flockId, sheet.date)) ? f.copyWith(pendingSync: true) : f).toList();
    return Cached(sheet.copyWith(flocks: flocks), fromCache: c.fromCache, savedAt: c.savedAt);
  }

  @override
  Future<Cached<DayRecord>> day(String farmId, String flockId, String date) async {
    Cached<DayRecord> base;
    try {
      base = await cachedRead(cache, 'day:$farmId:$flockId:$date', () => api.dayJson(farmId, flockId, date), (j) => DayRecordModel.fromJson(j).toEntity());
    } on AppException catch (e) {
      // Never loaded and no connection: start from an empty day, so recording still works offline.
      if (!e.isNetwork) rethrow;
      base = Cached(DayRecord(flockId: flockId, date: date, birdsAlive: 0), fromCache: true, savedAt: DateTime.now());
    }
    var d = base.data;
    for (final op in (await _unsentDays(farmId)).where((o) => o.entityKey == dayKey(flockId, date))) {
      d = applyPatch(d, (op.payload['patch'] as Map).cast<String, dynamic>());
    }
    return Cached(d, fromCache: base.fromCache, savedAt: base.savedAt);
  }

  @override
  Future<List<FeedOption>> feedOptions(String farmId) async {
    final c = await cachedRead(cache, 'feed:$farmId', () async => {'items': (await api.feedStock(farmId)).map((i) => i.toJson()).toList()}, (j) => (j['items'] as List).cast<Map<String, dynamic>>().map(FeedStockItemModel.fromJson).toList());
    return c.data.map((i) => FeedOption(itemId: i.itemId, name: i.name, quantityKg: i.quantityKg.toDouble(), bagSizeKg: i.bagSizeKg?.toDouble())).toList();
  }

  @override
  Future<SaveOutcome> save({required String userId, required String farmId, required DayDraft draft, List<String> photoPaths = const []}) async {
    final patch = draft.toPatch()
      ..remove('version')
      ..remove('photos');
    final kept = <String>[];
    for (final p in photoPaths) {
      kept.add(await photos.keep(p));
    }
    await queue.enqueue(
      userId: userId,
      farmId: farmId,
      command: 'daily_record.patch',
      entityKey: dayKey(draft.base.flockId, draft.base.date),
      payload: {'flockId': draft.base.flockId, 'date': draft.base.date, 'patch': patch},
      baseVersion: draft.base.version,
      baseSnapshot: {...snapshotOf(draft.base, patch.keys), '_photos': draft.base.photos.map((p) => p.assetId).toList()},
      photoFiles: kept,
    );
    return SaveOutcome.queued;
  }
}

/// Offline-first farm work: lists cached for offline viewing; task completion and health events queued.
class FarmWorkRepositoryImpl implements FarmWorkRepository {
  FarmWorkRepositoryImpl({required this.api, required this.cache, required this.queue});

  final PoultryPilotApi api;
  final CacheStore cache;
  final SyncQueue queue;

  Future<Set<String>> _queuedIds(String farmId, String userId, String command, String field) async =>
      (await queue.list(userId: userId, farmId: farmId, statuses: OpStatus.unsynced)).where((o) => o.command == command).map((o) => o.payload[field] as String).toSet();

  List<TaskItem> _withQueued(List<TaskItem> tasks, Set<String> done) => tasks.map((t) => done.contains(t.id) ? t.copyWith(status: 'done', overdue: false, pendingSync: true) : t).toList();

  @override
  Future<TodayWork> today(String farmId, {required String userId}) async {
    final w = (await cachedRead(cache, 'today:$farmId', () => api.todayJson(farmId), TodayModel.fromJson)).data.toEntity();
    final done = await _queuedIds(farmId, userId, 'task.complete', 'taskId');
    final unsentDays = (await queue.list(farmId: farmId, statuses: OpStatus.unsynced, entityKeyPrefix: 'day:')).map((o) => o.entityKey).toSet();
    return w.copyWith(
      tasks: _withQueued(w.tasks, done).where((t) => t.isActive || t.pendingSync).toList(),
      dailyEntries: w.dailyEntries.map((e) => unsentDays.contains(dayKey(e.flockId, w.date)) ? e.copyWith(recorded: true) : e).toList(),
    );
  }

  @override
  Future<List<TaskItem>> tasks(String farmId, {required String userId, String status = 'active', String assignee = 'any'}) async {
    final c = await cachedRead(cache, 'tasks:$farmId:$status:$assignee', () async => {'items': await api.tasksJson(farmId, status: status, assignee: assignee)}, (j) => (j['items'] as List).cast<Map<String, dynamic>>().map((t) => TaskModel.fromJson(t).toEntity()).toList());
    return _withQueued(c.data, await _queuedIds(farmId, userId, 'task.complete', 'taskId'));
  }

  @override
  Future<TaskItem> createTask(String farmId, {required String title, String? dueDate, String priority = 'normal', String? flockId}) async =>
      (await api.createTask(farmId, {'title': title, if (dueDate != null) 'dueDate': dueDate, 'priority': priority, if (flockId != null) 'flockId': flockId})).toEntity();

  @override
  Future<void> completeTask(String farmId, String taskId, {required String userId, String? notes}) async {
    await queue.enqueue(userId: userId, farmId: farmId, command: 'task.complete', entityKey: 'task:$taskId', payload: {'taskId': taskId, if (notes != null && notes.isNotEmpty) 'notes': notes});
  }

  @override
  Future<Cached<List<FlockSummary>>> flocks(String farmId) => cachedRead(cache, 'flocks:$farmId', () => api.flocksJson(farmId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map((f) => FlockModel.fromJson(f).toSummary()).toList());

  @override
  Future<List<HouseItem>> houses(String farmId) async =>
      (await cachedRead(cache, 'houses:$farmId', () => api.housesJson(farmId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map(HouseModel.fromJson).toList())).data.map((h) => HouseItem(id: h.id, name: h.name, type: h.type)).toList();

  @override
  Future<FlockDetail> flock(String farmId, String flockId) async => (await cachedRead(cache, 'flock:$farmId:$flockId', () => api.flockJson(farmId, flockId), FlockModel.fromJson)).data.toDetail();

  @override
  Future<List<WeighIn>> weighIns(String farmId, String flockId) async =>
      (await cachedRead(cache, 'weighins:$farmId:$flockId', () => api.weighInsJson(farmId, flockId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map((w) => WeighInModel.fromJson(w).toEntity()).toList())).data;

  @override
  Future<Cached<List<TrendDay>>> trends(String farmId, {required String from, required String to, String? flockId}) => cachedRead(
        cache,
        'trends:$farmId:$from:$to:${flockId ?? 'all'}',
        () => api.trendsJson(farmId, from, to, flockId),
        (j) => (j['days'] as List).cast<Map<String, dynamic>>().map((d) => TrendDayModel.fromJson(d).toEntity()).toList(),
      );

  @override
  Future<List<HealthRecordItem>> healthRecords(String farmId, {required String userId}) async {
    List<HealthRecordItem> server;
    try {
      server = (await cachedRead(cache, 'health:$farmId', () => api.healthRecordsJson(farmId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map((r) => HealthRecordModel.fromJson(r).toEntity()).toList())).data;
    } on AppException catch (e) {
      if (!e.isNetwork) rethrow;
      server = const [];
    }
    final queued = (await queue.list(userId: userId, farmId: farmId, statuses: OpStatus.unsynced)).where((o) => o.command == 'health.record').map((o) {
      final p = o.payload;
      return HealthRecordItem(id: p['id'] as String, type: p['type'] as String, date: p['date'] as String, title: p['title'] as String, flockId: p['flockId'] as String?, affectedBirds: (p['affectedBirds'] as num?)?.toInt(), signs: (p['symptoms'] as List?)?.join(', '), pendingSync: true);
    });
    final ids = server.map((r) => r.id).toSet();
    return [...queued.where((q) => !ids.contains(q.id)), ...server];
  }

  @override
  Future<List<VaccinationItem>> vaccinations(String farmId, {required String userId}) async {
    final list = (await cachedRead(cache, 'vaccinations:$farmId', () => api.vaccinationsJson(farmId), (j) => (j['items'] as List).cast<Map<String, dynamic>>().map(VaccinationModel.fromJson).toList())).data;
    final given = await _queuedIds(farmId, userId, 'vaccination.administer', 'vaccinationId');
    return list.map((v) => VaccinationItem(id: v.id, flockId: v.flockId, vaccineName: v.vaccineName, dueDate: v.dueDate, state: given.contains(v.id) ? 'done' : v.state, pendingSync: given.contains(v.id))).toList();
  }

  @override
  Future<void> reportProblem(String farmId, {required String userId, required String flockId, required String date, required String title, required List<String> symptoms, int? affectedBirds}) async {
    final id = newUuid();
    await queue.enqueue(userId: userId, farmId: farmId, command: 'health.record', entityKey: 'health:$id', payload: {
      'id': id,
      'type': 'observation',
      'date': date,
      'flockId': flockId,
      'title': title,
      'symptoms': symptoms.map((s) => s.toLowerCase()).toList(),
      if (affectedBirds != null) 'affectedBirds': affectedBirds,
    });
  }

  @override
  Future<void> markVaccinated(String farmId, String vaccinationId, {required String userId, required String date, int? birds}) async {
    await queue.enqueue(userId: userId, farmId: farmId, command: 'vaccination.administer', entityKey: 'vaccination:$vaccinationId', payload: {'vaccinationId': vaccinationId, 'date': date, if (birds != null) 'birdsVaccinated': birds});
  }
}
