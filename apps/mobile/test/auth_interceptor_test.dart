import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/error/app_exception.dart';
import 'package:poultrypilot_mobile/core/network/api_client.dart';
import 'package:poultrypilot_mobile/core/storage/token_store.dart';

import 'support.dart';

void main() {
  late MemoryTokenStore store;
  late int expired;

  setUp(() {
    store = MemoryTokenStore()
      ..accessToken = 'old-access'
      ..refreshToken = 'refresh-1';
    expired = 0;
  });

  ApiClient client(FakeAdapter adapter) => ApiClient(store: store, onSessionExpired: () => expired++, baseUrl: 'http://api.test', adapter: adapter);

  test('an expired token is refreshed once and the request retried with the new token', () async {
    final adapter = FakeAdapter((o) async {
      if (o.path.endsWith('/auth/refresh')) return const FakeReply(200, {'accessToken': 'new-access', 'refreshToken': 'refresh-2'});
      return o.headers['Authorization'] == 'Bearer new-access' ? const FakeReply(200, {'ok': true}) : unauthenticated();
    });
    expect(await client(adapter).get('/me'), {'ok': true});
    expect(store.accessToken, 'new-access');
    expect(store.refreshToken, 'refresh-2');
    expect(adapter.requests.where((r) => r.path.endsWith('/auth/refresh')), hasLength(1));
  });

  test('several requests failing together share one refresh (a second would revoke the session)', () async {
    final adapter = FakeAdapter((o) async {
      if (o.path.endsWith('/auth/refresh')) {
        await Future<void>.delayed(const Duration(milliseconds: 20));
        return const FakeReply(200, {'accessToken': 'new-access', 'refreshToken': 'refresh-2'});
      }
      return o.headers['Authorization'] == 'Bearer new-access' ? const FakeReply(200, {'ok': true}) : unauthenticated();
    });
    final c = client(adapter);
    final results = await Future.wait([c.get('/a'), c.get('/b'), c.get('/c')]);
    expect(results, everyElement({'ok': true}));
    expect(adapter.requests.where((r) => r.path.endsWith('/auth/refresh')), hasLength(1));
  });

  test('a refused refresh signs out and clears the tokens', () async {
    final adapter = FakeAdapter((o) async => unauthenticated());
    await expectLater(client(adapter).get('/me'), throwsA(isA<AppException>().having((e) => e.status, 'status', 401)));
    expect(expired, 1);
    expect(store.refreshToken, isNull);
  });

  test('offline during refresh keeps the session for when the connection returns', () async {
    final adapter = FakeAdapter((o) async => o.path.endsWith('/auth/refresh') ? const FakeReply.offline() : unauthenticated());
    await expectLater(client(adapter).get('/me'), throwsA(isA<AppException>()));
    expect(store.refreshToken, 'refresh-1');
    expect(expired, 0); // not signed out
  });

  test('public requests (sign-in) carry no token and never refresh', () async {
    final adapter = FakeAdapter((o) async => const FakeReply(401, {
          'error': {'code': 'INVALID_CREDENTIALS', 'message': 'Email or password is wrong'},
        }));
    await expectLater(client(adapter).post('/auth/login', data: {'email': 'a', 'password': 'b'}, public: true), throwsA(isA<AppException>().having((e) => e.code, 'code', 'INVALID_CREDENTIALS')));
    expect(adapter.requests.single.headers['Authorization'], isNull);
    expect(expired, 0);
  });

  test('no connection becomes a network error with a readable message', () async {
    final adapter = FakeAdapter((o) async => const FakeReply.offline());
    await expectLater(client(adapter).get('/me'), throwsA(isA<AppException>().having((e) => e.isNetwork, 'isNetwork', isTrue)));
  });
}
