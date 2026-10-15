import 'dart:convert';

import '../../domain/entities/daily_entry.dart';

/// Pure rules for a day's sections, shared by the local overlay and conflict resolution (unit-tested).
///
/// A queued daily-record change remembers the values its sections had when the farmer edited them (the "base
/// snapshot"). If the server's day has moved on, the change still applies safely when every section it touches is
/// unchanged on the server: someone else changed other sections. Then it is resent on the server's version. If any
/// touched section changed on both sides, that is a real conflict and the farmer chooses.

/// The sections a PATCH can carry (photos are handled separately: they are always added, never conflict).
const daySectionKeys = ['feed', 'waterLitres', 'mortality', 'eggs', 'averageWeight', 'temperatureMinC', 'temperatureMaxC', 'humidityPercent', 'healthObservations'];

/// A comparable value for one section of a day (only what the record itself holds).
Object? sectionValue(DayRecord d, String key) {
  switch (key) {
    case 'feed':
      return (d.feed.where((f) => f.fromDailyRecord).map((f) => '${f.feedItemId ?? ''}:${f.quantityKg}').toList()..sort());
    case 'mortality':
      final byCause = <String, int>{};
      for (final m in d.mortality.where((m) => m.fromDailyRecord)) {
        byCause[m.cause] = (byCause[m.cause] ?? 0) + m.count;
      }
      return (byCause.entries.map((e) => '${e.key}:${e.value}').toList()..sort());
    case 'waterLitres':
      return d.waterLitres;
    case 'eggs':
      return d.eggsCollected == null ? null : '${d.eggsCollected}/${d.eggsBroken ?? 0}';
    case 'averageWeight':
      return d.averageWeightG;
    case 'temperatureMinC':
      return d.temperatureMinC;
    case 'temperatureMaxC':
      return d.temperatureMaxC;
    case 'humidityPercent':
      return d.humidityPercent;
    case 'healthObservations':
      return d.observations.map((o) => '${o.signs}|${o.affectedBirds ?? ''}').toList();
  }
  return null;
}

/// The base snapshot for the sections a patch touches.
Map<String, Object?> snapshotOf(DayRecord d, Iterable<String> keys) => {for (final k in keys.where(daySectionKeys.contains)) k: sectionValue(d, k)};

/// True when every section the patch touches is still as the farmer saw it on the server's newer day.
bool canMergeOnto(DayRecord server, Map<String, dynamic> patch, Map<String, Object?> baseSnapshot) {
  for (final k in patch.keys.where(daySectionKeys.contains)) {
    if (jsonEncode(sectionValue(server, k)) != jsonEncode(baseSnapshot[k])) return false;
  }
  return true;
}

/// The day as the farmer will see it once the patch is applied (for showing queued changes before they sync).
/// Entries the record does not own (feed or deaths entered elsewhere) are kept.
DayRecord applyPatch(DayRecord d, Map<String, dynamic> patch, {List<String> newPhotoIds = const []}) {
  var out = d;
  if (patch['feed'] is List) {
    final lines = (patch['feed'] as List).cast<Map>().map((l) => FeedLine(feedItemId: l['feedItemId'] as String?, quantityKg: (l['quantityKg'] as num).toDouble(), kind: 'consumption', fromDailyRecord: true));
    out = out.copyWith(feed: [...out.feed.where((f) => !f.fromDailyRecord), ...lines]);
  }
  if (patch['mortality'] is List) {
    final lines = (patch['mortality'] as List).cast<Map>().map((l) => MortalityLine(cause: l['cause'] as String, count: (l['count'] as num).toInt(), fromDailyRecord: true));
    out = out.copyWith(mortality: [...out.mortality.where((m) => !m.fromDailyRecord), ...lines]);
  }
  if (patch.containsKey('waterLitres')) out = out.copyWith(waterLitres: (patch['waterLitres'] as num?)?.toDouble());
  if (patch['eggs'] is Map) {
    final e = patch['eggs'] as Map;
    out = out.copyWith(eggsCollected: (e['collected'] as num).toInt(), eggsBroken: (e['broken'] as num? ?? 0).toInt());
  }
  if (patch['averageWeight'] is Map) {
    final w = patch['averageWeight'] as Map;
    out = out.copyWith(averageWeightG: (w['averageWeightG'] as num).toDouble(), weightSampleSize: (w['sampleSize'] as num?)?.toInt());
  }
  if (patch.containsKey('temperatureMinC')) out = out.copyWith(temperatureMinC: (patch['temperatureMinC'] as num?)?.toDouble());
  if (patch.containsKey('temperatureMaxC')) out = out.copyWith(temperatureMaxC: (patch['temperatureMaxC'] as num?)?.toDouble());
  if (patch.containsKey('humidityPercent')) out = out.copyWith(humidityPercent: (patch['humidityPercent'] as num?)?.toDouble());
  if (patch['healthObservations'] is List) {
    out = out.copyWith(observations: (patch['healthObservations'] as List).cast<Map>().map((o) => Observation(signs: o['signs'] as String, affectedBirds: (o['affectedBirds'] as num?)?.toInt())).toList());
  }
  if (newPhotoIds.isNotEmpty) out = out.copyWith(photos: [...out.photos, ...newPhotoIds.map((id) => PhotoRef(assetId: id))]);
  return out;
}
