import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';

/// Every API failure, with the server's stable error code (see packages/constants/src/errors.ts).
class ApiException implements Exception {
  const ApiException(this.code, this.message, {this.status = 0, this.requestId});

  final String code;
  final String message;
  final int status;
  final String? requestId;

  @override
  String toString() => 'ApiException($code, $status): $message';
}

class ApiResponse<T> {
  const ApiResponse(this.status, this.data);
  final int status;
  final T data;
}

/// Thin HTTP client for the PoultryPilot REST API. The same endpoints serve the web app.
class ApiClient {
  ApiClient(this.config, {http.Client? httpClient, this.timeout = const Duration(seconds: 10)})
      : _http = httpClient ?? http.Client();

  final AppConfig config;
  final http.Client _http;
  final Duration timeout;

  Uri _uri(String path) => Uri.parse('${config.apiBaseUrl}${AppConfig.apiPrefix}$path');

  Future<ApiResponse<Map<String, dynamic>>> getJson(String path, {Set<int> acceptStatuses = const {}}) async {
    final http.Response res;
    try {
      res = await _http.get(_uri(path), headers: const {'Accept': 'application/json'}).timeout(timeout);
    } on TimeoutException {
      throw ApiException('TIMEOUT', 'The API did not answer within ${timeout.inSeconds} seconds.');
    } on SocketException {
      throw const ApiException('NETWORK_ERROR', 'The API could not be reached.');
    } on http.ClientException {
      throw const ApiException('NETWORK_ERROR', 'The API could not be reached.');
    }

    Map<String, dynamic>? body;
    try {
      final Object? decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) body = decoded;
    } on FormatException {
      body = null;
    }

    final ok = res.statusCode >= 200 && res.statusCode < 300;
    if ((ok || acceptStatuses.contains(res.statusCode)) && body != null) {
      return ApiResponse(res.statusCode, body);
    }

    final Object? error = body?['error'];
    if (error is Map<String, dynamic>) {
      throw ApiException(
        error['code'] as String? ?? 'HTTP_ERROR',
        error['message'] as String? ?? 'Request failed with status ${res.statusCode}.',
        status: res.statusCode,
        requestId: error['requestId'] as String?,
      );
    }
    throw ApiException('HTTP_ERROR', 'Request failed with status ${res.statusCode}.', status: res.statusCode);
  }

  void close() => _http.close();
}
