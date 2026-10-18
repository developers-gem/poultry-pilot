import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/daily_entry.dart';

part 'daily_entry_models.freezed.dart';
part 'daily_entry_models.g.dart';

/// JSON shapes of /daily-records/sheet, /flocks/:id/daily-records/:date, /feed/stock and /media
/// (see test/fixtures, captured from the real API).

@freezed
class SheetModel with _$SheetModel {
  const SheetModel._();
  const factory SheetModel({required String date, required String today, required String editWindowStart, @Default(<SheetFlockModel>[]) List<SheetFlockModel> flocks}) = _SheetModel;
  factory SheetModel.fromJson(Map<String, dynamic> json) => _$SheetModelFromJson(json);

  DailySheet toEntity() => DailySheet(date: date, today: today, editWindowStart: editWindowStart, flocks: flocks.map((f) => f.toEntity()).toList());
}

@freezed
class SheetFlockModel with _$SheetFlockModel {
  const SheetFlockModel._();
  const factory SheetFlockModel({
    required String flockId,
    required String flockCode,
    required String name,
    required String type,
    required String houseId,
    String? houseName,
    @Default(0) num expectedBirds,
    @Default(false) bool laying,
    SheetRecordModel? record,
    DaySummaryModel? previous,
  }) = _SheetFlockModel;
  factory SheetFlockModel.fromJson(Map<String, dynamic> json) => _$SheetFlockModelFromJson(json);

  SheetFlock toEntity() => SheetFlock(flockId: flockId, flockCode: flockCode, name: name, type: type, houseId: houseId, houseName: houseName, expectedBirds: expectedBirds.toInt(), laying: laying, recorded: record?.summary.toEntity(), previous: previous?.toEntity());
}

@freezed
class SheetRecordModel with _$SheetRecordModel {
  const factory SheetRecordModel({required String id, required int version, required DaySummaryModel summary}) = _SheetRecordModel;
  factory SheetRecordModel.fromJson(Map<String, dynamic> json) => _$SheetRecordModelFromJson(json);
}

@freezed
class DaySummaryModel with _$DaySummaryModel {
  const DaySummaryModel._();
  const factory DaySummaryModel({@Default(0) num mortality, @Default(0) num culls, @Default(0) num feedKg, num? waterLitres, num? eggsCollected, num? eggsBroken, num? averageWeightG, @Default(0) num observations, @Default(0) num photos}) = _DaySummaryModel;
  factory DaySummaryModel.fromJson(Map<String, dynamic> json) => _$DaySummaryModelFromJson(json);

  DaySummary toEntity() => DaySummary(mortality: mortality.toInt(), culls: culls.toInt(), feedKg: feedKg.toDouble(), waterLitres: waterLitres?.toDouble(), eggsCollected: eggsCollected?.toInt(), eggsBroken: eggsBroken?.toInt(), averageWeightG: averageWeightG?.toDouble(), observations: observations.toInt(), photos: photos.toInt());
}

@freezed
class DayRecordModel with _$DayRecordModel {
  const DayRecordModel._();
  const factory DayRecordModel({
    String? id,
    int? version,
    required String flockId,
    required String date,
    @Default(0) num birdsAliveEndOfDay,
    @Default(<MortalityLineModel>[]) List<MortalityLineModel> mortality,
    @Default(<FeedLineModel>[]) List<FeedLineModel> feed,
    num? waterLitres,
    num? temperatureMinC,
    num? temperatureMaxC,
    num? humidityPercent,
    EggsModel? eggs,
    WeightModel? averageWeight,
    @Default(<ObservationModel>[]) List<ObservationModel> healthObservations,
    @Default(<PhotoModel>[]) List<PhotoModel> photos,
  }) = _DayRecordModel;
  factory DayRecordModel.fromJson(Map<String, dynamic> json) => _$DayRecordModelFromJson(json);

  DayRecord toEntity() => DayRecord(
        id: id,
        version: version,
        flockId: flockId,
        date: date,
        birdsAlive: birdsAliveEndOfDay.toInt(),
        mortality: mortality.map((m) => MortalityLine(cause: m.cause, count: m.count.toInt(), fromDailyRecord: m.fromDailyRecord)).toList(),
        feed: feed.map((f) => FeedLine(feedItemId: f.feedItemId, quantityKg: f.quantityKg.toDouble(), kind: f.kind, fromDailyRecord: f.fromDailyRecord)).toList(),
        waterLitres: waterLitres?.toDouble(),
        temperatureMinC: temperatureMinC?.toDouble(),
        temperatureMaxC: temperatureMaxC?.toDouble(),
        humidityPercent: humidityPercent?.toDouble(),
        eggsCollected: eggs?.collected.toInt(),
        eggsBroken: eggs?.broken.toInt(),
        averageWeightG: averageWeight?.averageWeightG.toDouble(),
        weightSampleSize: averageWeight?.sampleSize?.toInt(),
        observations: healthObservations.map((o) => Observation(signs: o.signs, affectedBirds: o.affectedBirds?.toInt())).toList(),
        photos: photos.map((p) => PhotoRef(assetId: p.assetId, caption: p.caption, url: p.url)).toList(),
      );
}

@freezed
class MortalityLineModel with _$MortalityLineModel {
  const factory MortalityLineModel({required String cause, required num count, @Default(true) bool fromDailyRecord}) = _MortalityLineModel;
  factory MortalityLineModel.fromJson(Map<String, dynamic> json) => _$MortalityLineModelFromJson(json);
}

@freezed
class FeedLineModel with _$FeedLineModel {
  const factory FeedLineModel({String? feedItemId, required num quantityKg, @Default('consumption') String kind, @Default(true) bool fromDailyRecord}) = _FeedLineModel;
  factory FeedLineModel.fromJson(Map<String, dynamic> json) => _$FeedLineModelFromJson(json);
}

@freezed
class EggsModel with _$EggsModel {
  const factory EggsModel({required num collected, @Default(0) num broken}) = _EggsModel;
  factory EggsModel.fromJson(Map<String, dynamic> json) => _$EggsModelFromJson(json);
}

@freezed
class WeightModel with _$WeightModel {
  const factory WeightModel({required num averageWeightG, num? sampleSize}) = _WeightModel;
  factory WeightModel.fromJson(Map<String, dynamic> json) => _$WeightModelFromJson(json);
}

@freezed
class ObservationModel with _$ObservationModel {
  const factory ObservationModel({required String signs, num? affectedBirds}) = _ObservationModel;
  factory ObservationModel.fromJson(Map<String, dynamic> json) => _$ObservationModelFromJson(json);
}

@freezed
class PhotoModel with _$PhotoModel {
  const factory PhotoModel({required String assetId, String? caption, String? url}) = _PhotoModel;
  factory PhotoModel.fromJson(Map<String, dynamic> json) => _$PhotoModelFromJson(json);
}

@freezed
class FeedStockItemModel with _$FeedStockItemModel {
  const factory FeedStockItemModel({required String itemId, required String name, @Default(0) num quantityKg, num? bagSizeKg}) = _FeedStockItemModel;
  factory FeedStockItemModel.fromJson(Map<String, dynamic> json) => _$FeedStockItemModelFromJson(json);
}

/// POST /farms/:id/media.
@freezed
class MediaModel with _$MediaModel {
  const factory MediaModel({required String id, required String url, String? contentType}) = _MediaModel;
  factory MediaModel.fromJson(Map<String, dynamic> json) => _$MediaModelFromJson(json);
}
