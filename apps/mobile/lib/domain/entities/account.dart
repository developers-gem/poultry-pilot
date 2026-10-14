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

@freezed
class NotificationPreferences with _$NotificationPreferences {
  const factory NotificationPreferences({required bool pushEnabled, required bool emailEnabled, required String pushMinSeverity, required String emailMinSeverity, @Default(<String>[]) List<String> mutedRuleKeys}) = _NotificationPreferences;
}
