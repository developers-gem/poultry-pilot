import 'package:dio/dio.dart';

/// Every failure the app shows, in one shape: the API's error code, a message for people, the HTTP status,
/// the request id (for support) and per-field messages from validation.
class AppException implements Exception {
  const AppException({required this.code, required this.message, this.status = 0, this.requestId, this.fieldErrors = const {}});

  final String code;
  final String message;
  final int status;
  final String? requestId;

  /// API validation messages by field path ("email", "farm.name").
  final Map<String, String> fieldErrors;

  bool get isNetwork => code == 'NETWORK_ERROR' || code == 'TIMEOUT';
  bool get isUnauthenticated => status == 401;
  bool get isForbidden => status == 403 && code == 'FORBIDDEN';

  /// The API's error envelope: { "error": { "code", "message", "details": [{ "path", "message" }], "requestId" } }.
  factory AppException.fromEnvelope(Object? body, {int status = 0}) {
    final error = body is Map && body['error'] is Map ? (body['error'] as Map).cast<String, dynamic>() : null;
    if (error == null) {
      return AppException(code: 'HTTP_ERROR', message: 'Something went wrong (status $status). Please try again.', status: status);
    }
    final fields = <String, String>{};
    final details = error['details'];
    if (details is List) {
      for (final d in details.whereType<Map>()) {
        final path = d['path'];
        final message = d['message'];
        if (path is String && message is String) fields.putIfAbsent(path, () => message);
      }
    }
    return AppException(
      code: (error['code'] as String?) ?? 'HTTP_ERROR',
      message: (error['message'] as String?) ?? 'Something went wrong.',
      status: status,
      requestId: error['requestId'] as String?,
      fieldErrors: fields,
    );
  }

  factory AppException.fromDio(DioException e) {
    final inner = e.error;
    if (inner is AppException) return inner;
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return const AppException(code: 'TIMEOUT', message: 'PoultryPilot is taking too long to answer. Check your connection and try again.');
      case DioExceptionType.connectionError:
        return const AppException(code: 'NETWORK_ERROR', message: "Can't reach PoultryPilot. Check your connection.");
      case DioExceptionType.badResponse:
        return AppException.fromEnvelope(e.response?.data, status: e.response?.statusCode ?? 0);
      default:
        return AppException(code: 'NETWORK_ERROR', message: e.message ?? "Can't reach PoultryPilot.");
    }
  }

  /// A message suited to the screen (permission and email cases phrased for people).
  String get userMessage {
    if (isForbidden) return "Your role on this farm doesn't include this.";
    if (code == 'EMAIL_NOT_VERIFIED') return 'Confirm your email address first: check your inbox for the link.';
    return message;
  }

  @override
  String toString() => 'AppException($code, $status): $message';
}
