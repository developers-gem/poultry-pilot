import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/database/app_database.dart';
import 'package:poultrypilot_mobile/core/network/api_client.dart';
import 'package:poultrypilot_mobile/core/storage/token_store.dart';
import 'package:poultrypilot_mobile/data/datasources/local/cache_store.dart';
import 'package:poultrypilot_mobile/data/datasources/remote/poultrypilot_api.dart';
import 'package:poultrypilot_mobile/data/repositories/repositories_impl.dart';

import 'support.dart';

void main() {
  test('the dashboard is cached, and served from the cache when offline (marked as such)', () async {
    var online = true;
    final adapter = FakeAdapter((o) async => online ? FakeReply(200, fixture('dashboard')) : const FakeReply.offline());
    final store = MemoryTokenStore()..accessToken = 'a';
    final db = AppDatabase(NativeDatabase.memory());
    final repo = DashboardRepositoryImpl(api: PoultryPilotApi(ApiClient(store: store, onSessionExpired: () {}, baseUrl: 'http://api.test', adapter: adapter)), cache: CacheStore(db));

    final fresh = await repo.dashboard('f1');
    expect(fresh.fromCache, isFalse);
    expect(fresh.data.production!.birdsAlive, 996);

    online = false;
    final cached = await repo.dashboard('f1');
    expect(cached.fromCache, isTrue);
    expect(cached.data.production!.birdsAlive, 996);

    await expectLater(repo.dashboard('another-farm'), throwsA(anything)); // nothing cached for it
    await db.close();
  });
}
