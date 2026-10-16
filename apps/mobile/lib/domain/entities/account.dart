import 'package:freezed_annotation/freezed_annotation.dart';

part 'account.freezed.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String email,
    required String fullName,
    String? phone,
    required bool emailVerified,
    required bool hasPassword,
    required bool googleLinked,
    @Default(<String>[]) List<String> platformRoles,
  }) = _User;
}

/// The person's role on one farm, with the permissions that role carries (from the API).
@freezed
class Membership with _$Membership {
  const Membership._();

  const factory Membership({required String membershipId, required String farmId, required String farmName, required String role, @Default(<String>[]) List<String> permissions}) = _Membership;

  bool can(String permission) => permissions.contains(permission);
}

/// GET /me: who is signed in and the farms they belong to.
@freezed
class Account with _$Account {
  const factory Account({required User user, String? sessionId, @Default(<Membership>[]) List<Membership> memberships}) = _Account;
}

@freezed
class AuthTokens with _$AuthTokens {
  const factory AuthTokens({required String accessToken, required String refreshToken}) = _AuthTokens;
}

/// A signed-in device (Profile → Devices).
@freezed
class DeviceSession with _$DeviceSession {
  const factory DeviceSession({required String id, String? deviceName, required String platform, required String createdAt, required String lastUsedAt, required bool current}) = _DeviceSession;
}

/// How the person wants to be told (shared with the web app). In-app notifications are always kept.
@freezed
class NotificationPreferences with _$NotificationPreferences {
  const factory NotificationPreferences({
    required bool pushEnabled,
    required bool emailEnabled,
    required String pushMinSeverity,
    required String emailMinSeverity,
    @Default(<String>[]) List<String> mutedRuleKeys,
    @Default(<CategoryPreference>[]) List<CategoryPreference> categories,
    QuietHours? quietHours,
  }) = _NotificationPreferences;
}

/// One of the twelve categories (vaccinations, tasks, stock, deaths, ...), with its channels.
@freezed
class CategoryPreference with _$CategoryPreference {
  const factory CategoryPreference({required String key, required String label, required String description, required bool push, required bool email}) = _CategoryPreference;
}

/// Push waits until the end of quiet hours (critical alerts still come through).
@freezed
class QuietHours with _$QuietHours {
  const factory QuietHours({required String start, required String end, required String timezone}) = _QuietHours;
}

/// An in-app notification (the inbox).
@freezed
class InboxNotification with _$InboxNotification {
  const InboxNotification._();

  const factory InboxNotification({required String id, required String title, String? body, String? category, String? severity, String? path, String? entity, String? entityId, required String createdAt, required bool read}) = _InboxNotification;
}
