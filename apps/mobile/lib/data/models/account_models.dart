import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/account.dart';
import 'farm_models.dart';

part 'account_models.freezed.dart';
part 'account_models.g.dart';

/// JSON shapes of the API's /auth and /me responses (see test/fixtures, captured from the real API).

@freezed
class UserModel with _$UserModel {
  const UserModel._();

  const factory UserModel({
    required String id,
    required String email,
    required String fullName,
    String? phone,
    @Default(<String>[]) List<String> platformRoles,
    required bool emailVerified,
    @Default(true) bool hasPassword,
    @Default(false) bool googleLinked,
    String? createdAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);

  User toEntity() => User(id: id, email: email, fullName: fullName, phone: phone, emailVerified: emailVerified, hasPassword: hasPassword, googleLinked: googleLinked, platformRoles: platformRoles);
}

@freezed
class MembershipModel with _$MembershipModel {
  const MembershipModel._();

  const factory MembershipModel({required String membershipId, required String farmId, required String farmName, required String role, @Default(<String>[]) List<String> permissions}) = _MembershipModel;

  factory MembershipModel.fromJson(Map<String, dynamic> json) => _$MembershipModelFromJson(json);

  Membership toEntity() => Membership(membershipId: membershipId, farmId: farmId, farmName: farmName, role: role, permissions: permissions);
}

@freezed
class AccountModel with _$AccountModel {
  const AccountModel._();

  const factory AccountModel({required UserModel user, String? sessionId, @Default(<MembershipModel>[]) List<MembershipModel> memberships}) = _AccountModel;

  factory AccountModel.fromJson(Map<String, dynamic> json) => _$AccountModelFromJson(json);

  Account toEntity() => Account(user: user.toEntity(), sessionId: sessionId, memberships: memberships.map((m) => m.toEntity()).toList());
}

@freezed
class TokensModel with _$TokensModel {
  const TokensModel._();

  const factory TokensModel({required String accessToken, required String refreshToken, String? accessTokenExpiresAt, String? refreshTokenExpiresAt, String? sessionId}) = _TokensModel;

  factory TokensModel.fromJson(Map<String, dynamic> json) => _$TokensModelFromJson(json);

  AuthTokens toEntity() => AuthTokens(accessToken: accessToken, refreshToken: refreshToken);
}

/// POST /auth/login and /auth/register (register also returns the farm it created).
@freezed
class AuthResponseModel with _$AuthResponseModel {
  const factory AuthResponseModel({required UserModel user, required TokensModel tokens, FarmModel? farm}) = _AuthResponseModel;

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) => _$AuthResponseModelFromJson(json);
}

@freezed
class DeviceSessionModel with _$DeviceSessionModel {
  const DeviceSessionModel._();

  const factory DeviceSessionModel({required String id, String? deviceName, required String platform, String? ipAddress, required String createdAt, required String lastUsedAt, String? expiresAt, @Default(false) bool current}) = _DeviceSessionModel;

  factory DeviceSessionModel.fromJson(Map<String, dynamic> json) => _$DeviceSessionModelFromJson(json);

  DeviceSession toEntity() => DeviceSession(id: id, deviceName: deviceName, platform: platform, createdAt: createdAt, lastUsedAt: lastUsedAt, current: current);
}

@freezed
class NotificationPreferencesModel with _$NotificationPreferencesModel {
  const NotificationPreferencesModel._();

  const factory NotificationPreferencesModel({required bool pushEnabled, required bool emailEnabled, required String pushMinSeverity, required String emailMinSeverity, @Default(<String>[]) List<String> mutedRuleKeys}) = _NotificationPreferencesModel;

  factory NotificationPreferencesModel.fromJson(Map<String, dynamic> json) => _$NotificationPreferencesModelFromJson(json);

  factory NotificationPreferencesModel.fromEntity(NotificationPreferences p) => NotificationPreferencesModel(pushEnabled: p.pushEnabled, emailEnabled: p.emailEnabled, pushMinSeverity: p.pushMinSeverity, emailMinSeverity: p.emailMinSeverity, mutedRuleKeys: p.mutedRuleKeys);

  NotificationPreferences toEntity() => NotificationPreferences(pushEnabled: pushEnabled, emailEnabled: emailEnabled, pushMinSeverity: pushMinSeverity, emailMinSeverity: emailMinSeverity, mutedRuleKeys: mutedRuleKeys);
}
