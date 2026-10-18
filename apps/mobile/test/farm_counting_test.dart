import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/data/models/farm_work_models.dart';
import 'package:poultrypilot_mobile/presentation/entry/entry_sheets.dart';

import 'support.dart';

/// Counting the way farmers count: trays of eggs, collections through the day, feed in bags.
void main() {
  group('eggs in trays and collections', () {
    test('trays of 30 plus loose eggs', () {
      expect(eggDayTotals(haveEggs: 0, haveBroken: 0, adding: false, trays: 133, loose: 10, broken: 6), (4000, 6));
    });

    test('the afternoon collection is added to the morning one (never typed twice, never overwritten)', () {
      final morning = eggDayTotals(haveEggs: 0, haveBroken: 0, adding: false, trays: 70, loose: 0, broken: 4);
      final day = eggDayTotals(haveEggs: morning.$1, haveBroken: morning.$2, adding: true, trays: 60, loose: 12, broken: 2);
      expect(day, (2100 + 1812, 6));
    });

    test("correcting the day's total replaces it", () {
      expect(eggDayTotals(haveEggs: 3900, haveBroken: 6, adding: false, trays: 130, loose: 0, broken: 5), (3900, 5));
    });
  });

  group('feed in bags', () {
    test('bags × bag size, half bags allowed; kg as typed without a bag size', () {
      expect(feedKg('5', bagSizeKg: 50, inBags: true), 250);
      expect(feedKg('4.5', bagSizeKg: 50, inBags: true), 225);
      expect(feedKg('230', bagSizeKg: 50, inBags: false), 230);
      expect(feedKg('230', inBags: true), 230); // no bag size known: kg
    });
  });

  test('flock detail: a layer shows feed per dozen and eggs per hen housed; doubtful FCR carries its reason', () {
    final d = FlockModel.fromJson(fixture('flock_detail')).toDetail();
    expect(d.flock.isLaying, isTrue);
    expect(d.fcr, isNull); // layers have no weight-based FCR
    expect(d.feedPerDozenEggsKg, greaterThan(0));
    expect(d.eggsPerHenHoused, greaterThan(0));
  });
}
