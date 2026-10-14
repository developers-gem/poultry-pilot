import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_timezone/flutter_timezone.dart';

import '../../core/error/app_exception.dart';
import '../../core/providers.dart';
import '../session/session_controller.dart';

/// State of an auth form: idle, submitting, failed (with per-field messages from the API) or done.
class AuthFormState {
  const AuthFormState({this.submitting = false, this.error, this.done = false});

  final bool submitting;
  final AppException? error;
  final bool done;

  String? field(String name) => error?.fieldErrors[name];

  /// The message to show above the form when no single field explains the failure.
  String? get banner => error == null ? null : (error!.fieldErrors.isEmpty ? error!.userMessage : null);
}

/// View model for login, sign-up and forgot password.
class AuthViewModel extends AutoDisposeNotifier<AuthFormState> {
  @override
  AuthFormState build() => const AuthFormState();

  Future<void> _run(Future<void> Function() action) async {
    state = const AuthFormState(submitting: true);
    try {
      await action();
      state = const AuthFormState(done: true);
    } on AppException catch (e) {
      state = AuthFormState(error: e);
    } catch (_) {
      state = const AuthFormState(error: AppException(code: 'UNKNOWN', message: 'Something went wrong. Please try again.'));
    }
  }

  Future<void> login(String email, String password) => _run(() => ref.read(sessionProvider.notifier).login(email, password));

  Future<void> register({required String fullName, required String farmName, required String email, required String password, required String currency}) => _run(() async {
        final timezone = await deviceTimezone();
        await ref.read(sessionProvider.notifier).register(fullName: fullName, email: email, password: password, farmName: farmName.isEmpty ? 'My Farm' : farmName, currency: currency, timezone: timezone);
      });

  Future<void> forgotPassword(String email) => _run(() => ref.read(authRepositoryProvider).requestPasswordReset(email));
}

final authViewModelProvider = NotifierProvider.autoDispose<AuthViewModel, AuthFormState>(AuthViewModel.new);

/// The device's IANA time zone (the API stores farm dates in the farm's zone). Falls back to UTC.
Future<String> deviceTimezone() async {
  try {
    return await FlutterTimezone.getLocalTimezone();
  } catch (_) {
    return 'UTC';
  }
}

/// Currencies offered at sign-up (the farm's currency for all money; changeable later on the web).
const currencies = ['INR', 'USD', 'EUR', 'GBP', 'KES', 'NGN', 'GHS', 'UGX', 'TZS', 'ZAR', 'PKR', 'BDT', 'NPR', 'LKR', 'PHP', 'IDR', 'VND', 'THB', 'BRL', 'MXN', 'AUD', 'CAD'];
