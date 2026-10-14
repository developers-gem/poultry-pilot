import 'package:freezed_annotation/freezed_annotation.dart';

part 'farm.freezed.dart';

@freezed
class Farm with _$Farm {
  const factory Farm({
    required String id,
    required String name,
    String? description,
    String? countryCode,
    String? locationLabel,
    required String timezone,
    required String currency,
    required String myRole,
    required int version,
  }) = _Farm;
}
