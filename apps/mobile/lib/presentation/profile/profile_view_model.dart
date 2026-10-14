import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../domain/entities/account.dart';
import '../session/session_controller.dart';

/// Signed-in devices (Profile → Devices).
final sessionsProvider = FutureProvider.autoDispose<List<DeviceSession>>((ref) => ref.watch(profileRepositoryProvider).sessions());

/// Profile actions. Each returns normally on success and throws AppException on failure (the screen shows it).
class ProfileViewModel {
  ProfileViewModel(this.ref);

  final Ref ref;

  Future<void> saveProfile(String fullName, String phone) async {
    final account = await ref.read(profileRepositoryProvider).updateProfile(fullName: fullName, phone: phone);
    ref.read(sessionProvider.notifier).updateAccount(account);
  }

  Future<void> changePassword(String current, String next) => ref.read(profileRepositoryProvider).changePassword(currentPassword: current, newPassword: next);

  Future<void> resendVerification() => ref.read(profileRepositoryProvider).resendVerification();

  Future<void> revoke(String sessionId) async {
    await ref.read(profileRepositoryProvider).revokeSession(sessionId);
    ref.invalidate(sessionsProvider);
  }

  Future<void> revokeOthers() async {
    await ref.read(profileRepositoryProvider).revokeOtherSessions();
    ref.invalidate(sessionsProvider);
  }
}

final profileViewModelProvider = Provider.autoDispose<ProfileViewModel>((ref) => ProfileViewModel(ref));
