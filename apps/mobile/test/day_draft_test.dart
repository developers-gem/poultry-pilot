import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/data/models/daily_entry_models.dart';
import 'package:poultrypilot_mobile/domain/entities/daily_entry.dart';

import 'support.dart';

/// The fast-entry rules: only touched sections are sent, and other people's entries are never overwritten.
void main() {
  DayRecord day(String name) => DayRecordModel.fromJson(fixture(name)).toEntity();

  test('nothing touched sends only the version (and the screen offers no save)', () {
    final d = DayDraft(day('daily_record_day'));
    expect(d.hasChanges, isFalse);
    expect(d.toPatch(), {'version': 1});
  });

  test('saving the eggs sends just the eggs, with the version the farmer saw', () {
    final d = DayDraft(day('daily_record_day'))..setEggs(910, 6);
    expect(d.toPatch(), {'eggs': {'collected': 910, 'broken': 6}, 'version': 1});
    expect(d.changeCount, 1);
  });

  test('feed: only the line entered in the record is replaced; feed entered elsewhere is shown, not touched', () {
    final d = DayDraft(day('daily_record_day'));
    expect(d.recordFeedKg, 110); // in the record
    expect(d.otherFeedKg, 0); // the 5 kg elsewhere was wastage, not eaten
    d.setFeed(120, 'feed-item-1');
    expect(d.toPatch()['feed'], [{'quantityKg': 120.0, 'feedItemId': 'feed-item-1'}]);
    d.setFeed(0, null);
    expect(d.toPatch()['feed'], isEmpty); // clearing removes the record's feed line
  });

  test('deaths are kept per cause; zero counts are dropped', () {
    final d = DayDraft(day('daily_record_day'));
    expect(d.currentMortality, {'unknown': 1});
    d.setDeaths('heat_stress', 3);
    d.setDeaths('unknown', 0);
    expect(d.currentDeaths, 3);
    expect(d.toPatch()['mortality'], [{'cause': 'heat_stress', 'count': 3}]);
  });

  test('a new day has no version; observations, weight, climate and photos all go in one save', () {
    final d = DayDraft(day('daily_record_empty'))
      ..setWater(240)
      ..setWeight(1800, 10)
      ..setTemperature(24, 33.5)
      ..setHumidity(62)
      ..addObservation(const Observation(signs: 'Coughing, Not eating', affectedBirds: 3));
    d.newPhotos.add(const PhotoRef(assetId: 'a1'));
    final p = d.toPatch();
    expect(p.containsKey('version'), isFalse);
    expect(p, {
      'waterLitres': 240.0,
      'averageWeight': {'averageWeightG': 1800.0, 'sampleSize': 10},
      'temperatureMinC': 24.0,
      'temperatureMaxC': 33.5,
      'humidityPercent': 62.0,
      'healthObservations': [{'signs': 'Coughing, Not eating', 'affectedBirds': 3}],
      'photos': [{'assetId': 'a1'}],
    });
  });

  test('new photos are added to the ones already saved (at most 10)', () {
    final d = DayDraft(day('daily_record_patched'));
    d.newPhotos.add(const PhotoRef(assetId: 'new'));
    final photos = d.toPatch()['photos'] as List;
    expect(photos, hasLength(2));
    expect((photos.last as Map)['assetId'], 'new');
  });

  test('after someone else saved, the edits move onto the newer day intact', () {
    final d = DayDraft(day('daily_record_day'))
      ..setEggs(905, 4)
      ..setDeaths('predator', 2);
    final rebased = d.rebase(day('daily_record_patched'));
    expect(rebased.touched, d.touched);
    expect(rebased.toPatch()['eggs'], {'collected': 905, 'broken': 4});
    expect(rebased.toPatch()['version'], 1); // the newer day's version
  });
}
