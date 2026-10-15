import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:poultrypilot_mobile/data/datasources/local/photo_store.dart';

import 'support.dart';

/// Photo files in memory.
class MemoryPhotos implements PhotoStore {
  final Map<String, List<int>> files = {'/camera/a.jpg': [0xff, 0xd8, 1], '/camera/b.jpg': [0xff, 0xd8, 2]};
  int kept = 0;
  @override
  Future<String> keep(String sourcePath) async {
    final path = '/kept/${kept++}.jpg';
    files[path] = files[sourcePath]!;
    return path;
  }

  @override
  Future<List<int>> read(String path) async => files[path]!;
  @override
  Future<void> delete(String path) async => files.remove(path);
}

/// A scripted PoultryPilot API with the server's sync rules: a mutation is applied once (its result is stored and
/// replayed by mutation id), a stale day version is a conflict carrying the server's day, rejections are stored.
/// Failures can be injected exactly where interruptions happen in the field.
class FakeSyncServer {
  bool online = true;

  /// The next push requests: apply everything, then lose the response (the phone sees a network error).
  int dropResponses = 0;

  /// The next push: apply this many mutations, then fail with a 500 (the rest are not applied).
  int? crashAfter;

  /// Uploads: the n-th upload (1-based) fails with a network error.
  int? failUploadNumber;
  bool refuseRefresh = false;
  bool sessionExpired = false;

  final processed = <String, Map<String, dynamic>>{};
  final applied = <String, int>{};
  final days = <String, Map<String, dynamic>>{'l1:2026-10-14': fixture('daily_record_day')};
  int deaths = 0;
  final doneTasks = <String>{};
  int uploads = 0;
  int pushRequests = 0;

  Map<String, dynamic> _body(RequestOptions o) => (o.data is String ? jsonDecode(o.data as String) : o.data) as Map<String, dynamic>;

  Future<FakeReply> handle(RequestOptions o) async {
    if (!online) return const FakeReply.offline();
    final path = o.path;
    if (path.endsWith('/auth/refresh')) {
      return refuseRefresh ? unauthenticated() : const FakeReply(200, {'accessToken': 'new-access', 'refreshToken': 'new-refresh'});
    }
    if (sessionExpired && o.headers['Authorization'] != 'Bearer new-access') return unauthenticated();
    if (path.endsWith('/media')) {
      uploads++;
      if (failUploadNumber == uploads) {
        failUploadNumber = null;
        return const FakeReply.offline();
      }
      return FakeReply(201, {'id': 'asset-$uploads', 'url': '/m/$uploads'});
    }
    if (path.endsWith('/sync/push')) return _push(_body(o));
    final m = RegExp(r'/flocks/([^/]+)/daily-records/([0-9-]+)$').firstMatch(path);
    if (m != null) return FakeReply(200, days['${m[1]}:${m[2]}'] ?? {'id': null, 'version': null, 'flockId': m[1], 'date': m[2], 'photos': []});
    return const FakeReply(404, {'error': {'code': 'NOT_FOUND', 'message': 'no route'}});
  }

  FakeReply _push(Map<String, dynamic> body) {
    pushRequests++;
    final results = <Map<String, dynamic>>[];
    var appliedThisRequest = 0;
    for (final mu in (body['mutations'] as List).cast<Map<String, dynamic>>()) {
      final id = mu['mutationId'] as String;
      if (processed.containsKey(id)) {
        results.add(processed[id]!);
        continue;
      }
      if (crashAfter != null && appliedThisRequest >= crashAfter!) {
        crashAfter = null;
        return const FakeReply(500, {'error': {'code': 'INTERNAL', 'message': 'server restarting'}});
      }
      final r = _apply(mu);
      if (r['status'] != 'conflict') processed[id] = r;
      if (r['status'] == 'accepted') {
        applied[id] = (applied[id] ?? 0) + 1;
        appliedThisRequest++;
      }
      results.add(r);
    }
    if (dropResponses > 0) {
      dropResponses--;
      return const FakeReply.offline();
    }
    return FakeReply(200, {'results': results});
  }

  Map<String, dynamic> _apply(Map<String, dynamic> mu) {
    final id = mu['mutationId'];
    final p = (mu['payload'] as Map).cast<String, dynamic>();
    switch (mu['command']) {
      case 'daily_record.patch':
        final key = '${p['flockId']}:${p['date']}';
        final existing = days[key];
        final base = mu['baseVersion'];
        if (existing != null && base != existing['version']) return {'mutationId': id, 'status': 'conflict', 'serverVersion': existing['version'], 'serverDocument': existing};
        final day = Map<String, dynamic>.from(existing ?? {'id': 'rec-$key', 'flockId': p['flockId'], 'date': p['date'], 'photos': <dynamic>[]});
        final patch = (p['patch'] as Map).cast<String, dynamic>();
        for (final e in patch.entries) {
          day[e.key == 'healthObservations' ? 'healthObservations' : e.key] = e.key == 'mortality'
              ? [for (final l in e.value as List) {...(l as Map), 'fromDailyRecord': true}]
              : e.key == 'feed'
                  ? [for (final l in e.value as List) {...(l as Map), 'kind': 'consumption', 'fromDailyRecord': true}]
                  : e.value;
        }
        day['version'] = existing == null ? 0 : (existing['version'] as int) + 1;
        days[key] = day;
        return {'mutationId': id, 'status': 'accepted', 'entityId': day['id'], 'version': day['version']};
      case 'flock.mortality':
        deaths += (p['count'] as num).toInt();
        return {'mutationId': id, 'status': 'accepted', 'entityId': 'event-$id'};
      case 'task.complete':
        doneTasks.add(p['taskId'] as String);
        return {'mutationId': id, 'status': 'accepted', 'entityId': p['taskId'], 'version': 1};
      default:
        return {'mutationId': id, 'status': 'rejected', 'code': 'VALIDATION_FAILED', 'message': 'Not allowed: ${mu['command']}'};
    }
  }
}
