import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/data/models/daily_entry_models.dart';
import 'package:poultrypilot_mobile/data/models/dashboard_models.dart';
import 'package:poultrypilot_mobile/data/models/farm_work_models.dart';

import 'support.dart';

/// The farmer workflow's models against responses captured from the real API.
void main() {
  test('home: the dashboard has birds, deaths, feed, water, eggs, weight, alerts and tasks', () {
    final d = DashboardModel.fromJson(fixture('dashboard')).toEntity();
    final p = d.production!;
    expect(p.birdsAlive, 996);
    expect(p.waterLitres, 210);
    expect(p.averageWeightG, 1780);
    expect(p.latestWeighingDate, isNotNull);
    expect(p.flocks.single.averageWeightG, 1780);
    expect(d.tasks!.open, 2);
    expect(d.tasks!.overdue, 1);
    expect(d.tasks!.next.first.title, 'Order litter');
  });

  test('the entry sheet lists each flock with its house, today and yesterday', () {
    final s = SheetModel.fromJson(fixture('daily_sheet')).toEntity();
    final f = s.flocks.single;
    expect(f.label, 'L1 · House A');
    expect(f.laying, isTrue);
    expect(f.isRecorded, isTrue);
    expect(f.previous!.eggsCollected, 895);
    expect(s.editWindowStart, isNotEmpty);
  });

  test('a day record: deaths and feed say whether they belong to the record', () {
    final d = DayRecordModel.fromJson(fixture('daily_record_day')).toEntity();
    expect(d.version, 1);
    expect(d.mortality.single.fromDailyRecord, isTrue);
    expect(d.feed.where((f) => f.fromDailyRecord).single.quantityKg, 110);
    expect(d.feed.where((f) => !f.fromDailyRecord).single.kind, 'wastage');
    final empty = DayRecordModel.fromJson(fixture('daily_record_empty')).toEntity();
    expect(empty.id, isNull);
    expect(empty.version, isNull);
    final saved = DayRecordModel.fromJson(fixture('daily_record_patched')).toEntity();
    expect(saved.temperatureMaxC, 33);
    expect(saved.humidityPercent, 61);
    expect(saved.averageWeightG, 1780);
    expect(saved.observations.single.signs, 'Two birds coughing');
    expect(saved.photos.single.assetId, MediaModel.fromJson(fixture('media_uploaded')).id);
  });

  test('feed choices, tasks for today, flocks, weigh-ins, trends and health', () {
    expect(FeedStockItemModel.fromJson((fixture('feed_stock')['items'] as List).first as Map<String, dynamic>).name, 'Layer mash');
    final today = TodayModel.fromJson(fixture('tasks_today')).toEntity();
    expect(today.tasks.first.overdue, isTrue);
    expect(today.scheduled.any((s) => s.type == 'vaccination_due'), isTrue);
    expect(today.dailyEntries.single.flockCode, 'L1');
    expect(TaskModel.fromJson(fixture('task_completed')).toEntity().status, 'done');
    final detail = FlockModel.fromJson(fixture('flock_detail')).toDetail();
    expect(detail.alive, 996);
    expect(detail.averageWeightG, isNotNull);
    final weighIns = (fixture('flock_weighings')['items'] as List).cast<Map<String, dynamic>>().map((j) => WeighInModel.fromJson(j).toEntity()).toList();
    expect(weighIns.last.uniformityPercent, 100);
    final days = (fixture('trends')['days'] as List).cast<Map<String, dynamic>>().map((j) => TrendDayModel.fromJson(j).toEntity()).toList();
    expect(days, hasLength(14));
    expect(days.last.waterLitres, 210);
    final records = (fixture('health_records')['items'] as List).cast<Map<String, dynamic>>().map((j) => HealthRecordModel.fromJson(j).toEntity()).toList();
    expect(records.any((r) => r.signs == 'Two birds coughing'), isTrue);
    final states = (fixture('vaccinations')['items'] as List).cast<Map<String, dynamic>>().map((j) => VaccinationModel.fromJson(j).state).toSet();
    expect(states, containsAll(['due', 'overdue']));
  });
}
