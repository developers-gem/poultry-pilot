/// Build-time configuration, passed with `--dart-define-from-file=config/dev.json`.
/// Nothing secret belongs here: anything compiled into a mobile app can be extracted.
class AppConfig {
  const AppConfig({required this.apiBaseUrl, required this.environment});

  /// API origin without a trailing slash, e.g. `http://10.0.2.2:4000`.
  final String apiBaseUrl;
  final String environment;

  static const String apiPrefix = '/api/v1';

  factory AppConfig.fromEnvironment() {
    const base = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000');
    const env = String.fromEnvironment('APP_ENV', defaultValue: 'development');
    return AppConfig(apiBaseUrl: base.replaceAll(RegExp(r'/+$'), ''), environment: env);
  }
}
