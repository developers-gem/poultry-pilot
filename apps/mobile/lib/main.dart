import 'package:flutter/material.dart';

import 'src/api/api_client.dart';
import 'src/api/health.dart';
import 'src/config/app_config.dart';
import 'src/features/health/health_screen.dart';

void main() {
  final config = AppConfig.fromEnvironment();
  runApp(PoultryPilotApp(config: config, client: ApiClient(config)));
}

class PoultryPilotApp extends StatelessWidget {
  const PoultryPilotApp({super.key, required this.config, required this.client});

  final AppConfig config;
  final ApiClient client;

  @override
  Widget build(BuildContext context) {
    // Brand colour from the web design tokens (--color-brand in apps/web/src/styles.css).
    const brand = Color(0xFF6D5CF0);
    return MaterialApp(
      title: 'PoultryPilot',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: brand, useMaterial3: true),
      home: HealthScreen(api: HealthApi(client), apiBaseUrl: config.apiBaseUrl),
    );
  }
}
