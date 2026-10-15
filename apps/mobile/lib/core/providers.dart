import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/datasources/local/cache_store.dart';
import '../data/datasources/local/photo_store.dart';
import '../data/datasources/remote/poultrypilot_api.dart';
import '../data/repositories/farm_work_repositories.dart';
import '../data/repositories/repositories_impl.dart';
import '../data/sync/local_refresher.dart';
import '../data/sync/sync_engine.dart';
import '../data/sync/sync_queue.dart';
import '../domain/repositories/repositories.dart';
import 'database/app_database.dart';
import 'device/device_identity.dart';
import 'network/api_client.dart';
import 'storage/token_store.dart';

/// Dependency wiring. Tests override these with fakes (see test/).
final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});

/// Raised by the HTTP layer when the session can no longer be refreshed; the session controller listens.
final sessionExpiredProvider = StateProvider<int>((ref) => 0);

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(store: ref.watch(tokenStoreProvider), onSessionExpired: () => ref.read(sessionExpiredProvider.notifier).state++);
});

final apiProvider = Provider<PoultryPilotApi>((ref) => PoultryPilotApi(ref.watch(apiClientProvider)));
final cacheStoreProvider = Provider<CacheStore>((ref) => CacheStore(ref.watch(databaseProvider)));

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final store = ref.watch(tokenStoreProvider);
  return AuthRepositoryImpl(api: ref.watch(apiProvider), tokens: store, cache: ref.watch(cacheStoreProvider), device: () => DeviceIdentity.load(store), photos: ref.watch(photoStoreProvider));
});
final farmRepositoryProvider = Provider<FarmRepository>((ref) => FarmRepositoryImpl(api: ref.watch(apiProvider), tokens: ref.watch(tokenStoreProvider)));
final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) => DashboardRepositoryImpl(api: ref.watch(apiProvider), cache: ref.watch(cacheStoreProvider)));
final profileRepositoryProvider = Provider<ProfileRepository>((ref) => ProfileRepositoryImpl(api: ref.watch(apiProvider)));
final settingsRepositoryProvider = Provider<SettingsRepository>((ref) => SettingsRepositoryImpl(api: ref.watch(apiProvider), cache: ref.watch(cacheStoreProvider)));

final photoStoreProvider = Provider<PhotoStore>((ref) => FilePhotoStore());
final syncQueueProvider = Provider<SyncQueue>((ref) => SyncQueue(ref.watch(databaseProvider)));
final dailyEntryRepositoryProvider = Provider<DailyEntryRepository>((ref) => DailyEntryRepositoryImpl(api: ref.watch(apiProvider), cache: ref.watch(cacheStoreProvider), queue: ref.watch(syncQueueProvider), photos: ref.watch(photoStoreProvider)));
final farmWorkRepositoryProvider = Provider<FarmWorkRepository>((ref) => FarmWorkRepositoryImpl(api: ref.watch(apiProvider), cache: ref.watch(cacheStoreProvider), queue: ref.watch(syncQueueProvider)));
final localRefresherProvider = Provider<LocalRefresher>((ref) => LocalRefresher(dashboard: ref.watch(dashboardRepositoryProvider), entries: ref.watch(dailyEntryRepositoryProvider), work: ref.watch(farmWorkRepositoryProvider)));

/// The user whose changes are sent (null when signed out). Set by the session controller.
final syncUserProvider = StateProvider<String?>((ref) => null);

final syncEngineProvider = Provider<SyncEngine>((ref) {
  final store = ref.watch(tokenStoreProvider);
  return SyncEngine(
    api: ref.watch(apiProvider),
    queue: ref.watch(syncQueueProvider),
    photos: ref.watch(photoStoreProvider),
    tokens: store,
    interceptor: ref.watch(apiClientProvider).interceptor,
    deviceId: () async => (await DeviceIdentity.load(store)).deviceId,
    refresh: (farmId) async {
      final user = ref.read(syncUserProvider);
      if (user != null) await ref.read(localRefresherProvider).refresh(farmId, userId: user);
    },
  );
});
