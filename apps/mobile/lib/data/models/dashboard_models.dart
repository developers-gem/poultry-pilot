import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/dashboard.dart';

part 'dashboard_models.freezed.dart';
part 'dashboard_models.g.dart';

/// GET /farms/:id/dashboard. A section is absent when the person may not see it, and is
/// `{ "unavailable": reason }` when it could not be computed; both become null here.
Map<String, dynamic>? _available(Object? j) => j is Map && !j.containsKey('unavailable') ? j.cast<String, dynamic>() : null;
Object? _weatherReason(Map<dynamic, dynamic> json, String key) {
  final w = json['weather'];
  return w is Map ? w['unavailable'] : null;
}

ProductionModel? _production(Object? j) => _available(j) == null ? null : ProductionModel.fromJson(_available(j)!);
WeatherModel? _weather(Object? j) => _available(j) == null ? null : WeatherModel.fromJson(_available(j)!);
InventoryModel? _inventory(Object? j) => _available(j) == null ? null : InventoryModel.fromJson(_available(j)!);
HatcheryModel? _hatchery(Object? j) => _available(j) == null ? null : HatcheryModel.fromJson(_available(j)!);
FinanceModel? _finance(Object? j) => _available(j) == null ? null : FinanceModel.fromJson(_available(j)!);
List<UpcomingModel> _upcoming(Object? j) => j is List ? j.whereType<Map>().map((e) => UpcomingModel.fromJson(e.cast<String, dynamic>())).toList() : const [];

@freezed
class DashboardModel with _$DashboardModel {
  const DashboardModel._();

  const factory DashboardModel({
    required String date,
    required DashboardFarmModel farm,
    required AlertsModel alerts,
    @JsonKey(fromJson: _production) ProductionModel? production,
    @JsonKey(fromJson: _weather) WeatherModel? weather,
    @JsonKey(readValue: _weatherReason) String? weatherUnavailable,
    @JsonKey(fromJson: _upcoming) @Default(<UpcomingModel>[]) List<UpcomingModel> upcoming,
    @JsonKey(fromJson: _inventory) InventoryModel? inventory,
    @JsonKey(fromJson: _hatchery) HatcheryModel? hatchery,
    @JsonKey(fromJson: _finance) FinanceModel? finance,
  }) = _DashboardModel;

  factory DashboardModel.fromJson(Map<String, dynamic> json) => _$DashboardModelFromJson(json);

  DashboardSummary toEntity() => DashboardSummary(
        date: date,
        farmName: farm.name,
        currency: farm.currency,
        alerts: AlertsSummary(
          open: alerts.open,
          critical: alerts.bySeverity['critical'] ?? 0,
          warning: alerts.bySeverity['warning'] ?? 0,
          info: alerts.bySeverity['info'] ?? 0,
          latest: alerts.latest.map((a) => AlertItem(id: a.id, severity: a.severity, title: a.title, date: a.date, ruleType: a.ruleType)).toList(),
        ),
        production: production == null
            ? null
            : ProductionToday(
                birdsAlive: production!.totals.birdsAlive.toInt(),
                mortality: production!.totals.mortality.toInt(),
                eggsCollected: production!.totals.eggsCollected.toInt(),
                eggsBroken: production!.totals.eggsBroken.toInt(),
                feedKg: production!.totals.feedKg.toDouble(),
                henDayPercent: production!.totals.henDayPercent?.toDouble(),
                flocksTotal: production!.flocksTotal,
                flocksRecorded: production!.flocksRecorded,
                flocks: production!.flocks.map((f) => FlockToday(flockId: f.flockId, flockCode: f.flockCode, type: f.type, birdsAlive: f.birdsAlive.toInt(), mortality: f.mortality.toInt(), eggsCollected: f.eggsCollected?.toInt(), recorded: f.recorded)).toList(),
              ),
        weather: weather == null
            ? null
            : WeatherToday(
                temperatureC: weather!.current.temperatureC?.toDouble(),
                humidityPercent: weather!.current.humidityPercent?.toDouble(),
                todayMaxC: weather!.today?.tempMaxC?.toDouble(),
                todayMinC: weather!.today?.tempMinC?.toDouble(),
                risks: weather!.risks.map((r) => r.reason).toList(),
                stale: weather!.stale,
              ),
        weatherUnavailable: weatherUnavailable,
        upcoming: upcoming.map((e) => UpcomingEvent(id: e.id, type: e.type, date: e.date, title: e.title, overdue: e.overdue)).toList(),
        inventory: inventory == null ? null : InventoryToday(feedDaysRemaining: inventory!.feedDaysRemaining?.toInt(), lowStockItems: inventory!.lowStockItems, lotsExpiringSoon: inventory!.lotsExpiringSoon, eggsInStock: inventory!.eggsInStock.toInt(), chicksAvailable: inventory!.chicksAvailable.toInt()),
        hatchery: hatchery == null ? null : HatcheryToday(incubating: hatchery!.incubating, eggsIncubating: hatchery!.eggsIncubating.toInt(), nextHatchCode: hatchery!.nextHatch?.code, nextHatchDate: hatchery!.nextHatch?.date),
        finance: finance == null
            ? null
            : FinanceToday(cashMinor: finance!.cashMinor.toInt(), receivablesMinor: finance!.receivablesMinor.toInt(), payablesMinor: finance!.payablesMinor.toInt(), monthRevenueMinor: finance!.monthToDate.revenueMinor.toInt(), monthExpensesMinor: finance!.monthToDate.expensesMinor.toInt(), monthProfitMinor: finance!.monthToDate.profitMinor.toInt()),
      );
}

@freezed
class DashboardFarmModel with _$DashboardFarmModel {
  const factory DashboardFarmModel({required String id, required String name, required String currency}) = _DashboardFarmModel;
  factory DashboardFarmModel.fromJson(Map<String, dynamic> json) => _$DashboardFarmModelFromJson(json);
}

@freezed
class AlertsModel with _$AlertsModel {
  const factory AlertsModel({required int open, @Default(<String, int>{}) Map<String, int> bySeverity, @Default(<AlertItemModel>[]) List<AlertItemModel> latest}) = _AlertsModel;
  factory AlertsModel.fromJson(Map<String, dynamic> json) => _$AlertsModelFromJson(json);
}

@freezed
class AlertItemModel with _$AlertItemModel {
  const factory AlertItemModel({required String id, required String ruleType, required String severity, required String status, required String title, required String date}) = _AlertItemModel;
  factory AlertItemModel.fromJson(Map<String, dynamic> json) => _$AlertItemModelFromJson(json);
}

@freezed
class ProductionModel with _$ProductionModel {
  const factory ProductionModel({required ProductionTotalsModel totals, required int flocksTotal, required int flocksRecorded, @Default(<FlockTodayModel>[]) List<FlockTodayModel> flocks}) = _ProductionModel;
  factory ProductionModel.fromJson(Map<String, dynamic> json) => _$ProductionModelFromJson(json);
}

@freezed
class ProductionTotalsModel with _$ProductionTotalsModel {
  const factory ProductionTotalsModel({required num birdsAlive, required num mortality, @Default(0) num culls, required num feedKg, @Default(0) num waterLitres, required num eggsCollected, required num eggsBroken, num? henDayPercent, num? mortalityRatePercent}) = _ProductionTotalsModel;
  factory ProductionTotalsModel.fromJson(Map<String, dynamic> json) => _$ProductionTotalsModelFromJson(json);
}

@freezed
class FlockTodayModel with _$FlockTodayModel {
  const factory FlockTodayModel({required String flockId, required String flockCode, required String type, required num birdsAlive, required num mortality, num? eggsCollected, required bool recorded}) = _FlockTodayModel;
  factory FlockTodayModel.fromJson(Map<String, dynamic> json) => _$FlockTodayModelFromJson(json);
}

@freezed
class WeatherModel with _$WeatherModel {
  const factory WeatherModel({required WeatherNowModel current, WeatherDayModel? today, @Default(<WeatherRiskModel>[]) List<WeatherRiskModel> risks, @Default(false) bool stale}) = _WeatherModel;
  factory WeatherModel.fromJson(Map<String, dynamic> json) => _$WeatherModelFromJson(json);
}

@freezed
class WeatherNowModel with _$WeatherNowModel {
  const factory WeatherNowModel({num? temperatureC, num? humidityPercent, num? rainMm, num? windKph}) = _WeatherNowModel;
  factory WeatherNowModel.fromJson(Map<String, dynamic> json) => _$WeatherNowModelFromJson(json);
}

@freezed
class WeatherDayModel with _$WeatherDayModel {
  const factory WeatherDayModel({required String date, num? tempMaxC, num? tempMinC, num? rainMm}) = _WeatherDayModel;
  factory WeatherDayModel.fromJson(Map<String, dynamic> json) => _$WeatherDayModelFromJson(json);
}

@freezed
class WeatherRiskModel with _$WeatherRiskModel {
  const factory WeatherRiskModel({required String date, required String kind, required String reason}) = _WeatherRiskModel;
  factory WeatherRiskModel.fromJson(Map<String, dynamic> json) => _$WeatherRiskModelFromJson(json);
}

@freezed
class UpcomingModel with _$UpcomingModel {
  const factory UpcomingModel({required String id, required String type, required String date, required String title, @Default(false) bool overdue}) = _UpcomingModel;
  factory UpcomingModel.fromJson(Map<String, dynamic> json) => _$UpcomingModelFromJson(json);
}

@freezed
class InventoryModel with _$InventoryModel {
  const factory InventoryModel({num? feedDaysRemaining, required int lowStockItems, required int lotsExpiringSoon, required num eggsInStock, required num chicksAvailable}) = _InventoryModel;
  factory InventoryModel.fromJson(Map<String, dynamic> json) => _$InventoryModelFromJson(json);
}

@freezed
class HatcheryModel with _$HatcheryModel {
  const factory HatcheryModel({required int incubating, required num eggsIncubating, NextHatchModel? nextHatch}) = _HatcheryModel;
  factory HatcheryModel.fromJson(Map<String, dynamic> json) => _$HatcheryModelFromJson(json);
}

@freezed
class NextHatchModel with _$NextHatchModel {
  const factory NextHatchModel({required String code, required String date}) = _NextHatchModel;
  factory NextHatchModel.fromJson(Map<String, dynamic> json) => _$NextHatchModelFromJson(json);
}

@freezed
class FinanceModel with _$FinanceModel {
  const factory FinanceModel({required num cashMinor, required num receivablesMinor, required num payablesMinor, required MonthToDateModel monthToDate}) = _FinanceModel;
  factory FinanceModel.fromJson(Map<String, dynamic> json) => _$FinanceModelFromJson(json);
}

@freezed
class MonthToDateModel with _$MonthToDateModel {
  const factory MonthToDateModel({required num revenueMinor, required num expensesMinor, required num profitMinor}) = _MonthToDateModel;
  factory MonthToDateModel.fromJson(Map<String, dynamic> json) => _$MonthToDateModelFromJson(json);
}
