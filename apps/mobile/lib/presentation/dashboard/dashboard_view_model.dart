import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../domain/entities/dashboard.dart';

/// The selected farm's dashboard: fresh from the API, or the device's copy when offline (marked as such).
final dashboardProvider = FutureProvider.autoDispose.family<Cached<DashboardSummary>, String>((ref, farmId) {
  return ref.watch(dashboardRepositoryProvider).dashboard(farmId);
});
