import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/sync/day_merge.dart';
import 'package:poultrypilot_mobile/data/models/daily_entry_models.dart';
import 'package:poultrypilot_mobile/data/models/sync_models.dart';

import 'support.dart';

void main() {
  final base = DayRecordModel.fromJson(fixture('daily_record_day')).toEntity();

  test('snapshots record only the sections a change touches', () {
    final s = snapshotOf(base, ['waterLitres', 'mortality', 'photos']);
    expect(s.keys, ['waterLitres', 'mortality']);
    expect(s['mortality'], ['unknown:1']);
  });

  test('merge allowed when the touched sections are unchanged on the server; refused when they changed', () {
    final snap = snapshotOf(base, ['waterLitres']);
    final otherChanged = applyPatch(base, {'eggs': {'collected': 5, 'broken': 0}});
    expect(canMergeOnto(otherChanged, {'waterLitres': 210}, snap), isTrue);
    final sameChanged = applyPatch(base, {'waterLitres': 999});
    expect(canMergeOnto(sameChanged, {'waterLitres': 210}, snap), isFalse);
  });

  test('applying a change replaces only the record\'s own feed and deaths', () {
    final out = applyPatch(base, {
      'feed': [{'quantityKg': 120, 'feedItemId': 'x'}],
      'mortality': [{'cause': 'predator', 'count': 2}],
      'temperatureMaxC': 34.5,
    });
    expect(out.feed.where((f) => !f.fromDailyRecord), hasLength(1)); // the wastage entered elsewhere stays
    expect(out.feed.where((f) => f.fromDailyRecord).single.quantityKg, 120);
    expect(out.mortality.single.cause, 'predator');
    expect(out.temperatureMaxC, 34.5);
  });

  test('the API\'s three sync answers parse (captured from the real server)', () {
    final r = (fixture('sync_push')['results'] as List).cast<Map<String, dynamic>>().map(SyncResultModel.fromJson).toList();
    expect(r.map((x) => x.status), ['accepted', 'rejected', 'conflict']);
    expect(r[0].version, 2);
    expect(r[1].message, contains('future'));
    final serverDay = DayRecordModel.fromJson(r[2].serverDocument!).toEntity();
    expect(serverDay.version, 2);
    expect(serverDay.waterLitres, 215);
  });
}
