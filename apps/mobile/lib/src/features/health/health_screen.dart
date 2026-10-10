import 'package:flutter/material.dart';

import '../../api/api_client.dart';
import '../../api/health.dart';

/// Shows whether this device can reach the API, and whether the API can reach MongoDB.
class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key, required this.api, required this.apiBaseUrl});

  final HealthApi api;
  final String apiBaseUrl;

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  late Future<HealthStatus> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.fetch();
  }

  void _refresh() {
    setState(() {
      _future = widget.api.fetch();
    });
  }

  Future<void> _pullToRefresh() async {
    _refresh();
    try {
      await _future;
    } catch (_) {
      // The FutureBuilder shows the error; the refresh indicator only needs to stop.
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('PoultryPilot')),
      body: RefreshIndicator(
        onRefresh: _pullToRefresh,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            FutureBuilder<HealthStatus>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const _StatusCard(
                    title: 'Checking the API…',
                    body: 'Contacting the PoultryPilot API.',
                    color: Colors.grey,
                  );
                }
                if (snapshot.hasError) {
                  final Object? err = snapshot.error;
                  final message = err is ApiException ? err.message : '$err';
                  return _StatusCard(
                    title: 'The API is not reachable',
                    body: '$message\n\nThis app is calling ${widget.apiBaseUrl}. '
                        'From the Android emulator, the API on your computer is http://10.0.2.2:4000.',
                    color: theme.colorScheme.error,
                  );
                }
                final h = snapshot.requireData;
                final latency = h.mongodb.latencyMs;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _StatusCard(
                      title: h.ok ? 'Everything is running' : 'The API is running, but MongoDB is not reachable',
                      body: h.ok
                          ? 'The API is up and connected to MongoDB.'
                          : 'Start the database on your computer with docker compose up -d mongo.',
                      color: h.ok ? Colors.green : Colors.orange,
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Column(
                        children: [
                          ListTile(
                            title: const Text('MongoDB'),
                            subtitle: h.mongodb.error == null ? null : Text(h.mongodb.error!),
                            trailing: Text(
                              h.mongodb.up
                                  ? (latency == null ? 'Connected' : 'Connected in $latency ms')
                                  : 'Not connected',
                            ),
                          ),
                          ListTile(title: const Text('Version'), trailing: Text(h.version)),
                          ListTile(title: const Text('Environment'), trailing: Text(h.environment)),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: _refresh, child: const Text('Check again')),
          ],
        ),
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.title, required this.body, required this.color});

  final String title;
  final String body;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: text.titleLarge),
                  const SizedBox(height: 8),
                  Text(body, style: text.bodyMedium),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
