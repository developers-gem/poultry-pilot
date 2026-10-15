import 'package:freezed_annotation/freezed_annotation.dart';

part 'sync_models.freezed.dart';
part 'sync_models.g.dart';

/// One answer from POST /sync/push (see test/fixtures/sync_push.json).
@freezed
class SyncResultModel with _$SyncResultModel {
  const factory SyncResultModel({
    required String mutationId,
    required String status, // accepted | rejected | conflict
    String? entityId,
    int? version,
    String? code,
    String? message,
    int? serverVersion,
    Map<String, dynamic>? serverDocument,
  }) = _SyncResultModel;

  factory SyncResultModel.fromJson(Map<String, dynamic> json) => _$SyncResultModelFromJson(json);
}
