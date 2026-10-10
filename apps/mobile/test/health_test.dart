import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:poultrypilot_mobile/src/api/api_client.dart';
import 'package:poultrypilot_mobile/src/api/health.dart';
import 'package:poultrypilot_mobile/src/config/app_config.dart';

const config = AppConfig(apiBaseUrl: 'http://api.test', environment: 'test');

ApiClient clientReturning(int status, Object body, {void Function(http.Request)? inspect}) {
  return ApiClient(config, httpClient: MockClient((req) async {
    inspect?.call(req);
    return http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});
  }));
}

void main() {
  test('calls the versioned health endpoint and parses a healthy response', () async {
    Uri? called;
    final api = HealthApi(clientReturning(200, {
      'status': 'ok',
      'version': '0.1.0',
      'environment': 'development',
      'uptimeSeconds': 12,
      'timestamp': '2026-10-10T09:34:27.584Z',
      'checks': {
        'mongodb': {'status': 'up', 'latencyMs': 2},
      },
    }, inspect: (r) => called = r.url));

    final h = await api.fetch();
    expect(called.toString(), 'http://api.test/api/v1/health');
    expect(h.ok, isTrue);
    expect(h.mongodb.up, isTrue);
    expect(h.mongodb.latencyMs, 2);
  });

  test('a 503 health response is data, not an exception', () async {
    final api = HealthApi(clientReturning(503, {
      'status': 'degraded',
      'version': '0.1.0',
      'environment': 'development',
      'uptimeSeconds': 6,
      'timestamp': '2026-10-10T09:34:30.617Z',
      'checks': {
        'mongodb': {'status': 'down', 'error': 'connect ECONNREFUSED 127.0.0.1:27017'},
      },
    }));
    final h = await api.fetch();
    expect(h.ok, isFalse);
    expect(h.mongodb.error, contains('ECONNREFUSED'));
  });

  test('error envelopes become ApiException with the server code', () async {
    final client = clientReturning(404, {
      'error': {'code': 'NOT_FOUND', 'message': 'Route not found', 'requestId': 'abc'},
    });
    await expectLater(
      client.getJson('/nope'),
      throwsA(isA<ApiException>()
          .having((e) => e.code, 'code', 'NOT_FOUND')
          .having((e) => e.requestId, 'requestId', 'abc')),
    );
  });
}
