import '../../domain/repositories/repositories.dart';

/// Step 5 of a sync, and on opening the app online: refresh the phone's copy of the farm's recent data, so every
/// screen opens offline with what was last on the server. Each read caches itself; failures are skipped.
class LocalRefresher {
  LocalRefresher({required this.dashboard, required this.entries, required this.work});

  final DashboardRepository dashboard;
  final DailyEntryRepository entries;
  final FarmWorkRepository work;

  Future<void> refresh(String farmId, {required String userId}) async {
    Future<void> quietly(Future<Object?> Function() f) async {
      try {
        await f();
      } catch (_) {}
    }

    await quietly(() => dashboard.dashboard(farmId));
    final sheet = await entries.sheet(farmId, null).then((s) => s.data).catchError((_) => null);
    if (sheet != null) {
      final yesterday = DateTime.parse(sheet.today).subtract(const Duration(days: 1)).toIso8601String().substring(0, 10);
      await quietly(() => entries.sheet(farmId, yesterday));
      for (final f in sheet.flocks) {
        await quietly(() => entries.day(farmId, f.flockId, sheet.today));
        await quietly(() => entries.day(farmId, f.flockId, yesterday));
      }
      final from = DateTime.parse(sheet.today).subtract(const Duration(days: 13)).toIso8601String().substring(0, 10);
      await quietly(() => work.trends(farmId, from: from, to: sheet.today));
    }
    await quietly(() => entries.feedOptions(farmId));
    await quietly(() => work.flocks(farmId));
    await quietly(() => work.houses(farmId));
    await quietly(() => work.today(farmId, userId: userId));
    await quietly(() => work.tasks(farmId, userId: userId));
    await quietly(() => work.healthRecords(farmId, userId: userId));
    await quietly(() => work.vaccinations(farmId, userId: userId));
  }
}
