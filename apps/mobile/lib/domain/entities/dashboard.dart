import 'package:freezed_annotation/freezed_annotation.dart';

part 'dashboard.freezed.dart';

/// GET /farms/:id/dashboard. Sections the person may not see are absent (null); sections that could not be
/// computed carry the server's reason in the matching *Unavailable field.
@freezed
class DashboardSummary with _$DashboardSummary {
  const factory DashboardSummary({
    required String date,
    required String farmName,
    required String currency,
    required AlertsSummary alerts,
    ProductionToday? production,
    WeatherToday? weather,
    String? weatherUnavailable,
    @Default(<UpcomingEvent>[]) List<UpcomingEvent> upcoming,
    InventoryToday? inventory,
    HatcheryToday? hatchery,
    FinanceToday? finance,
  }) = _DashboardSummary;
}

@freezed
class AlertsSummary with _$AlertsSummary {
  const factory AlertsSummary({required int open, required int critical, required int warning, required int info, @Default(<AlertItem>[]) List<AlertItem> latest}) = _AlertsSummary;
}

@freezed
class AlertItem with _$AlertItem {
  const factory AlertItem({required String id, required String severity, required String title, required String date, required String ruleType}) = _AlertItem;
}

@freezed
class ProductionToday with _$ProductionToday {
  const factory ProductionToday({
    required int birdsAlive,
    required int mortality,
    required int eggsCollected,
    required int eggsBroken,
    required double feedKg,
    double? henDayPercent,
    required int flocksTotal,
    required int flocksRecorded,
    @Default(<FlockToday>[]) List<FlockToday> flocks,
  }) = _ProductionToday;
}

@freezed
class FlockToday with _$FlockToday {
  const factory FlockToday({required String flockId, required String flockCode, required String type, required int birdsAlive, required int mortality, int? eggsCollected, required bool recorded}) = _FlockToday;
}

@freezed
class WeatherToday with _$WeatherToday {
  const factory WeatherToday({double? temperatureC, double? humidityPercent, double? todayMaxC, double? todayMinC, @Default(<String>[]) List<String> risks, required bool stale}) = _WeatherToday;
}

@freezed
class UpcomingEvent with _$UpcomingEvent {
  const factory UpcomingEvent({required String id, required String type, required String date, required String title, required bool overdue}) = _UpcomingEvent;
}

@freezed
class InventoryToday with _$InventoryToday {
  const factory InventoryToday({int? feedDaysRemaining, required int lowStockItems, required int lotsExpiringSoon, required int eggsInStock, required int chicksAvailable}) = _InventoryToday;
}

@freezed
class HatcheryToday with _$HatcheryToday {
  const factory HatcheryToday({required int incubating, required int eggsIncubating, String? nextHatchCode, String? nextHatchDate}) = _HatcheryToday;
}

@freezed
class FinanceToday with _$FinanceToday {
  const factory FinanceToday({required int cashMinor, required int receivablesMinor, required int payablesMinor, required int monthRevenueMinor, required int monthExpensesMinor, required int monthProfitMinor}) = _FinanceToday;
}

/// Data plus where it came from: fresh from the API, or the device's cache (offline).
class Cached<T> {
  const Cached(this.data, {required this.fromCache, required this.savedAt});

  final T data;
  final bool fromCache;
  final DateTime savedAt;
}
