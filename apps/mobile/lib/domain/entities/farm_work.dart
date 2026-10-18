import 'package:freezed_annotation/freezed_annotation.dart';

part 'farm_work.freezed.dart';

@freezed
class TaskItem with _$TaskItem {
  const TaskItem._();

  const factory TaskItem({
    required String id,
    required String kind,
    required String title,
    String? description,
    String? dueDate,
    required String status,
    required String priority,
    required bool overdue,
    String? flockId,
    String? flockCode,
    String? houseName,
    String? assigneeUserId,
    String? assigneeName,
    String? completedByName,
    String? resolutionNotes,
    required int version,
    @Default(false) bool pendingSync,
  }) = _TaskItem;

  bool get isActive => status == 'open' || status == 'in_progress';
  bool get needsNotes => kind == 'corrective_action';
}

/// Calendar work due today or overdue (vaccinations, cleaning, follow-ups...).
@freezed
class ScheduledItem with _$ScheduledItem {
  const factory ScheduledItem({required String id, required String type, required String date, required String title, required bool overdue, String? flockId}) = _ScheduledItem;
}

@freezed
class EntryStatus with _$EntryStatus {
  const factory EntryStatus({required String flockId, required String flockCode, String? houseName, required bool recorded}) = _EntryStatus;
}

/// GET /tasks/today.
@freezed
class TodayWork with _$TodayWork {
  const factory TodayWork({required String date, @Default(<TaskItem>[]) List<TaskItem> tasks, @Default(<ScheduledItem>[]) List<ScheduledItem> scheduled, @Default(<EntryStatus>[]) List<EntryStatus> dailyEntries, required int overdue, required int entriesMissing}) = _TodayWork;
}

@freezed
class FlockSummary with _$FlockSummary {
  const FlockSummary._();

  /// Layers and breeders: judged by eggs (feed per dozen), not by a weight-based FCR.
  bool get isLaying => type == 'layer' || type == 'breeder';

  const factory FlockSummary({required String id, required String houseId, required String name, required String flockCode, required String type, String? breed, String? placementDate, int? placementCount, required String status, int? currentBirdCount}) = _FlockSummary;
}

@freezed
class FlockDetail with _$FlockDetail {
  const FlockDetail._();

  const factory FlockDetail({
    required FlockSummary flock,
    int? ageDays,
    required int alive,
    required int mortality,
    double? mortalityRate,
    double? survivalRate,
    double? averageWeightG,
    String? latestWeighingDate,
    double? dailyWeightGainG,
    required double feedConsumedKg,
    double? feedPerBirdKg,
    double? fcr,
    /// The weigh-in date FCR is measured at (feed up to then ÷ weight then).
    String? fcrAsOf,
    /// FCR in doubt: "feed_gaps" (feed on few days) or "implausibly_low" (feed or weight is wrong).
    String? fcrWarning,
    @Default(0) int feedDaysRecorded,
    @Default(0) int feedDaysExpected,
    int? epef,
    /// Layers: kg of feed per dozen eggs, and eggs per hen housed (layers have no weight-based FCR).
    double? feedPerDozenEggsKg,
    double? eggsPerHenHoused,
    required int eggsCollected,
    required String stage,
  }) = _FlockDetail;

  /// Why FCR should not be trusted, in the farmer's words (null when it is fine).
  String? get fcrNote => switch (fcrWarning) {
        'feed_gaps' => 'Feed is recorded on $feedDaysRecorded of $feedDaysExpected days, so FCR may be too low. Fine if you enter feed in bulk.',
        'implausibly_low' => 'FCR is implausibly low for broilers: check the feed entries and the weights.',
        _ => null,
      };
}

@freezed
class WeighIn with _$WeighIn {
  const factory WeighIn({required String date, double? averageWeightG, int? sampleSize, double? uniformityPercent, double? cvPercent}) = _WeighIn;
}

@freezed
class TrendDay with _$TrendDay {
  const factory TrendDay({required String date, required int mortality, required double feedKg, required double waterLitres, required int eggsCollected, required int eggsBroken, required int records}) = _TrendDay;
}

@freezed
class HealthRecordItem with _$HealthRecordItem {
  const factory HealthRecordItem({required String id, required String type, required String date, required String title, String? flockId, int? affectedBirds, String? signs, String? vetName, @Default(false) bool pendingSync}) = _HealthRecordItem;
}

@freezed
class VaccinationItem with _$VaccinationItem {
  const factory VaccinationItem({required String id, required String flockId, required String vaccineName, required String dueDate, required String state, @Default(false) bool pendingSync}) = _VaccinationItem;
}

@freezed
class HouseItem with _$HouseItem {
  const factory HouseItem({required String id, required String name, required String type}) = _HouseItem;
}
