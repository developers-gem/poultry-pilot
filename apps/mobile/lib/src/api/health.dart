import 'api_client.dart';

/// Mirrors HealthResponse in packages/validation/src/schemas/system.ts.
/// Will be replaced by the Dart client generated from packages/contracts/openapi.json.
class DependencyStatus {
  const DependencyStatus({required this.up, this.latencyMs, this.error});

  final bool up;
  final int? latencyMs;
  final String? error;

  factory DependencyStatus.fromJson(Map<String, dynamic> json) => DependencyStatus(
        up: json['status'] == 'up',
        latencyMs: (json['latencyMs'] as num?)?.round(),
        error: json['error'] as String?,
      );
}

class HealthStatus {
  const HealthStatus({
    required this.ok,
    required this.version,
    required this.environment,
    required this.uptimeSeconds,
    required this.mongodb,
  });

  final bool ok;
  final String version;
  final String environment;
  final int uptimeSeconds;
  final DependencyStatus mongodb;

  factory HealthStatus.fromJson(Map<String, dynamic> json) {
    final checks = json['checks'] as Map<String, dynamic>? ?? const <String, dynamic>{};
    final mongo = checks['mongodb'] as Map<String, dynamic>? ?? const <String, dynamic>{'status': 'down'};
    return HealthStatus(
      ok: json['status'] == 'ok',
      version: json['version'] as String? ?? 'unknown',
      environment: json['environment'] as String? ?? 'unknown',
      uptimeSeconds: (json['uptimeSeconds'] as num?)?.round() ?? 0,
      mongodb: DependencyStatus.fromJson(mongo),
    );
  }
}

class HealthApi {
  const HealthApi(this._client);
  final ApiClient _client;

  /// GET /api/v1/health. A 503 still carries a health body, so it is returned, not thrown.
  Future<HealthStatus> fetch() async {
    final res = await _client.getJson('/health', acceptStatuses: const {503});
    return HealthStatus.fromJson(res.data);
  }
}
