import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/error/app_exception.dart';

import 'support.dart';

void main() {
  test('validation errors become field messages', () {
    final e = AppException.fromEnvelope(fixture('error_validation'), status: 400);
    expect(e.code, 'VALIDATION_FAILED');
    expect(e.fieldErrors['email'], 'Invalid email');
    expect(e.fieldErrors['password'], 'Use at least 10 characters'); // the first message per field
    expect(e.fieldErrors['farm.name'], isNotNull);
    expect(e.requestId, isNotNull);
  });

  test('wrong password, unconfirmed email and missing sign-in', () {
    final wrong = AppException.fromEnvelope(fixture('error_invalid_credentials'), status: 401);
    expect(wrong.code, 'INVALID_CREDENTIALS');
    expect(wrong.isUnauthenticated, isTrue);
    final email = AppException.fromEnvelope(fixture('error_email_not_verified'), status: 403);
    expect(email.userMessage, contains('Confirm your email'));
    expect(AppException.fromEnvelope(fixture('error_unauthenticated'), status: 401).isUnauthenticated, isTrue);
  });

  test('a body without the envelope still gives a readable error', () {
    final e = AppException.fromEnvelope('<html>Bad gateway</html>', status: 502);
    expect(e.code, 'HTTP_ERROR');
    expect(e.message, contains('502'));
  });
}
