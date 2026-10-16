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

  const factory NotificationPreferencesModel({
    required bool pushEnabled,
    required bool emailEnabled,
    required String pushMinSeverity,
    required String emailMinSeverity,
    @Default(<String>[]) List<String> mutedRuleKeys,
    @Default(<CategoryPreferenceModel>[]) List<CategoryPreferenceModel> categories,
    QuietHoursModel? quietHours,
  }) = _NotificationPreferencesModel;

  factory NotificationPreferencesModel.fromJson(Map<String, dynamic> json) => _$NotificationPreferencesModelFromJson(json);

  NotificationPreferences toEntity() => NotificationPreferences(
        pushEnabled: pushEnabled,
        emailEnabled: emailEnabled,
        pushMinSeverity: pushMinSeverity,
        emailMinSeverity: emailMinSeverity,
        mutedRuleKeys: mutedRuleKeys,
        categories: categories.map((c) => CategoryPreference(key: c.key, label: c.label, description: c.description, push: c.push, email: c.email)).toList(),
        quietHours: quietHours == null ? null : QuietHours(start: quietHours!.start, end: quietHours!.end, timezone: quietHours!.timezone),
      );
}

@freezed
class CategoryPreferenceModel with _$CategoryPreferenceModel {
  const factory CategoryPreferenceModel({required String key, required String label, @Default('') String description, @Default(true) bool push, @Default(true) bool email}) = _CategoryPreferenceModel;
  factory CategoryPreferenceModel.fromJson(Map<String, dynamic> json) => _$CategoryPreferenceModelFromJson(json);
}

@freezed
class QuietHoursModel with _$QuietHoursModel {
  const factory QuietHoursModel({required String start, required String end, required String timezone}) = _QuietHoursModel;
  factory QuietHoursModel.fromJson(Map<String, dynamic> json) => _$QuietHoursModelFromJson(json);
}

/// PUT /me/notification-preferences body (the API's request shape: categories as a map, quiet hours or null).
Map<String, dynamic> notificationPreferencesRequest(NotificationPreferences p) => {
      'pushEnabled': p.pushEnabled,
      'emailEnabled': p.emailEnabled,
      'pushMinSeverity': p.pushMinSeverity,
      'emailMinSeverity': p.emailMinSeverity,
      if (p.mutedRuleKeys.isNotEmpty) 'mutedRuleKeys': p.mutedRuleKeys,
      'categories': {for (final c in p.categories) c.key: {'push': c.push, 'email': c.email}},
      'quietHours': p.quietHours == null ? null : {'start': p.quietHours!.start, 'end': p.quietHours!.end, 'timezone': p.quietHours!.timezone},
    };

@freezed
class InboxItemModel with _$InboxItemModel {
  const InboxItemModel._();

  const factory InboxItemModel({required String id, required String title, String? body, String? category, String? severity, InboxLinkModel? link, required String createdAt, String? readAt}) = _InboxItemModel;
  factory InboxItemModel.fromJson(Map<String, dynamic> json) => _$InboxItemModelFromJson(json);

  InboxNotification toEntity() => InboxNotification(id: id, title: title, body: body, category: category, severity: severity, path: link?.path, entity: link?.entity, entityId: link?.id, createdAt: createdAt, read: readAt != null);
}

@freezed
class InboxLinkModel with _$InboxLinkModel {
  const factory InboxLinkModel({String? entity, String? id, String? path}) = _InboxLinkModel;
  factory InboxLinkModel.fromJson(Map<String, dynamic> json) => _$InboxLinkModelFromJson(json);
}

@freezed
class PushDeviceModel with _$PushDeviceModel {
  const factory PushDeviceModel({required String id, required String platform, String? deviceName}) = _PushDeviceModel;
  factory PushDeviceModel.fromJson(Map<String, dynamic> json) => _$PushDeviceModelFromJson(json);
}
