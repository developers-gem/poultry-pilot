/// Build-time configuration, passed with --dart-define-from-file (see config/dev.example.json and README.md).
class AppConfig {
  const AppConfig._();

  /// The PoultryPilot API: the same server the web app uses. Android emulators reach the host at 10.0.2.2.
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000');

  static const apiPrefix = '/api/v1';
  static const appVersion = String.fromEnvironment('APP_VERSION', defaultValue: '1.0.0');
  static const environment = String.fromEnvironment('APP_ENV', defaultValue: 'development');

  static bool get isProduction => environment == 'production';
}
