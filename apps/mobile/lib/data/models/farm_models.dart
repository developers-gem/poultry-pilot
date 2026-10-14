import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/farm.dart';

part 'farm_models.freezed.dart';
part 'farm_models.g.dart';

@freezed
class FarmSettingsModel with _$FarmSettingsModel {
  const factory FarmSettingsModel({required String timezone, required String currency, @Default('metric') String unitSystem, @Default(1) int workerEditWindowDays}) = _FarmSettingsModel;

  factory FarmSettingsModel.fromJson(Map<String, dynamic> json) => _$FarmSettingsModelFromJson(json);
}

/// GET /farms/:id and POST /farms.
@freezed
class FarmModel with _$FarmModel {
  const FarmModel._();

  const factory FarmModel({
    required String id,
    required String name,
    String? description,
    String? countryCode,
    String? locationLabel,
    required FarmSettingsModel settings,
    @Default(0) int version,
    @Default('owner') String myRole,
  }) = _FarmModel;

  factory FarmModel.fromJson(Map<String, dynamic> json) => _$FarmModelFromJson(json);

  Farm toEntity() => Farm(id: id, name: name, description: description, countryCode: countryCode, locationLabel: locationLabel, timezone: settings.timezone, currency: settings.currency, myRole: myRole, version: version);
}
