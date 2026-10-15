import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/farm_work.dart';

part 'farm_work_models.freezed.dart';
part 'farm_work_models.g.dart';

/// JSON shapes of /tasks, /flocks, /dashboard/trends and /health (see test/fixtures).

@freezed
class TaskModel with _$TaskModel {
  const TaskModel._();
  const factory TaskModel({
    required String id,
    required String kind,
    required String title,
    String? description,
    String? dueDate,
    required String status,
    required String priority,
    @Default(false) bool overdue,
    String? flockId,
    String? flockCode,
    String? houseName,
    String? assigneeUserId,
    String? assigneeName,
    String? completedByName,
    String? resolutionNotes,
    @Default(0) int version,
  }) = _TaskModel;
  factory TaskModel.fromJson(Map<String, dynamic> json) => _$TaskModelFromJson(json);

  TaskItem toEntity() => TaskItem(id: id, kind: kind, title: title, description: description, dueDate: dueDate, status: status, priority: priority, overdue: overdue, flockId: flockId, flockCode: flockCode, houseName: houseName, assigneeUserId: assigneeUserId, assigneeName: assigneeName, completedByName: completedByName, resolutionNotes: resolutionNotes, version: version);
}

@freezed
class ScheduledModel with _$ScheduledModel {
  const factory ScheduledModel({required String id, required String type, required String date, required String title, @Default(false) bool overdue, String? flockId}) = _ScheduledModel;
  factory ScheduledModel.fromJson(Map<String, dynamic> json) => _$ScheduledModelFromJson(json);
}

@freezed
class EntryStatusModel with _$EntryStatusModel {
  const factory EntryStatusModel({required String flockId, required String flockCode, String? houseName, @Default(false) bool recorded}) = _EntryStatusModel;
  factory EntryStatusModel.fromJson(Map<String, dynamic> json) => _$EntryStatusModelFromJson(json);
}

@freezed
class TodayCountsModel with _$TodayCountsModel {
  const factory TodayCountsModel({@Default(0) int tasks, @Default(0) int overdue, @Default(0) int scheduled, @Default(0) int entriesMissing}) = _TodayCountsModel;
  factory TodayCountsModel.fromJson(Map<String, dynamic> json) => _$TodayCountsModelFromJson(json);
}

@freezed
class TodayModel with _$TodayModel {
  const TodayModel._();
  const factory TodayModel({required String date, @Default(<TaskModel>[]) List<TaskModel> tasks, @Default(<ScheduledModel>[]) List<ScheduledModel> scheduled, @Default(<EntryStatusModel>[]) List<EntryStatusModel> dailyEntries, required TodayCountsModel counts}) = _TodayModel;
  factory TodayModel.fromJson(Map<String, dynamic> json) => _$TodayModelFromJson(json);

  TodayWork toEntity() => TodayWork(
        date: date,
        tasks: tasks.map((t) => t.toEntity()).toList(),
        scheduled: scheduled.map((s) => ScheduledItem(id: s.id, type: s.type, date: s.date, title: s.title, overdue: s.overdue, flockId: s.flockId)).toList(),
        dailyEntries: dailyEntries.map((e) => EntryStatus(flockId: e.flockId, flockCode: e.flockCode, houseName: e.houseName, recorded: e.recorded)).toList(),
        overdue: counts.overdue,
        entriesMissing: counts.entriesMissing,
      );
}

@freezed
class FlockModel with _$FlockModel {
  const FlockModel._();
  const factory FlockModel({required String id, required String houseId, required String name, required String flockCode, required String type, String? breed, String? placementDate, num? placementCount, required String status, num? currentBirdCount, FlockMetricsModel? metrics}) = _FlockModel;
  factory FlockModel.fromJson(Map<String, dynamic> json) => _$FlockModelFromJson(json);

  FlockSummary toSummary() => FlockSummary(id: id, houseId: houseId, name: name, flockCode: flockCode, type: type, breed: breed, placementDate: placementDate, placementCount: placementCount?.toInt(), status: status, currentBirdCount: currentBirdCount?.toInt());

  FlockDetail toDetail() {
    final m = metrics;
    return FlockDetail(
      flock: toSummary(),
      ageDays: m?.ageDays?.toInt(),
      alive: (m?.currentBirdCount ?? currentBirdCount ?? 0).toInt(),
      mortality: (m?.mortalityCount ?? 0).toInt(),
      mortalityRate: m?.mortalityRate?.toDouble(),
      survivalRate: m?.survivalRate?.toDouble(),
      averageWeightG: m?.averageWeightG?.toDouble(),
      latestWeighingDate: m?.latestWeighingDate,
      dailyWeightGainG: m?.dailyWeightGainG?.toDouble(),
      feedConsumedKg: (m?.feedConsumedKg ?? 0).toDouble(),
      feedPerBirdKg: m?.feedPerBirdKg?.toDouble(),
      fcr: m?.fcr?.toDouble(),
      eggsCollected: (m?.eggsCollected ?? 0).toInt(),
      stage: m?.stage ?? 'unknown',
    );
  }
}

@freezed
class FlockMetricsModel with _$FlockMetricsModel {
  const factory FlockMetricsModel({num? ageDays, num? currentBirdCount, num? mortalityCount, num? mortalityRate, num? survivalRate, num? averageWeightG, String? latestWeighingDate, num? dailyWeightGainG, num? feedConsumedKg, num? feedPerBirdKg, num? fcr, num? eggsCollected, String? stage}) = _FlockMetricsModel;
  factory FlockMetricsModel.fromJson(Map<String, dynamic> json) => _$FlockMetricsModelFromJson(json);
}

@freezed
class WeighInModel with _$WeighInModel {
  const WeighInModel._();
  const factory WeighInModel({required String date, num? averageWeightG, num? sampleSize, WeighStatsModel? stats}) = _WeighInModel;
  factory WeighInModel.fromJson(Map<String, dynamic> json) => _$WeighInModelFromJson(json);

  WeighIn toEntity() => WeighIn(date: date, averageWeightG: averageWeightG?.toDouble(), sampleSize: sampleSize?.toInt(), uniformityPercent: stats?.uniformityPercent?.toDouble(), cvPercent: stats?.cvPercent?.toDouble());
}

@freezed
class WeighStatsModel with _$WeighStatsModel {
  const factory WeighStatsModel({num? uniformityPercent, num? cvPercent}) = _WeighStatsModel;
  factory WeighStatsModel.fromJson(Map<String, dynamic> json) => _$WeighStatsModelFromJson(json);
}

@freezed
class TrendDayModel with _$TrendDayModel {
  const TrendDayModel._();
  const factory TrendDayModel({required String date, @Default(0) num mortality, @Default(0) num feedKg, @Default(0) num waterLitres, @Default(0) num eggsCollected, @Default(0) num eggsBroken, @Default(0) num records}) = _TrendDayModel;
  factory TrendDayModel.fromJson(Map<String, dynamic> json) => _$TrendDayModelFromJson(json);

  TrendDay toEntity() => TrendDay(date: date, mortality: mortality.toInt(), feedKg: feedKg.toDouble(), waterLitres: waterLitres.toDouble(), eggsCollected: eggsCollected.toInt(), eggsBroken: eggsBroken.toInt(), records: records.toInt());
}

@freezed
class HealthRecordModel with _$HealthRecordModel {
  const HealthRecordModel._();
  const factory HealthRecordModel({required String id, required String type, required String date, required String title, String? flockId, num? affectedBirds, String? observedSigns, String? vetName}) = _HealthRecordModel;
  factory HealthRecordModel.fromJson(Map<String, dynamic> json) => _$HealthRecordModelFromJson(json);

  HealthRecordItem toEntity() => HealthRecordItem(id: id, type: type, date: date, title: title, flockId: flockId, affectedBirds: affectedBirds?.toInt(), signs: observedSigns, vetName: vetName);
}

@freezed
class VaccinationModel with _$VaccinationModel {
  const factory VaccinationModel({required String id, required String flockId, required String vaccineName, required String dueDate, required String state}) = _VaccinationModel;
  factory VaccinationModel.fromJson(Map<String, dynamic> json) => _$VaccinationModelFromJson(json);
}

@freezed
class HouseModel with _$HouseModel {
  const factory HouseModel({required String id, required String name, required String type}) = _HouseModel;
  factory HouseModel.fromJson(Map<String, dynamic> json) => _$HouseModelFromJson(json);
}
