import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Loads a fixture captured from the real API (services/api/scripts/mobile-fixtures.ts).
Map<String, dynamic> fixture(String name) => (jsonDecode(File('test/fixtures/$name.json').readAsStringSync()) as Map).cast<String, dynamic>();

/// A scripted HTTP layer for Dio: each request is answered by [handler]; every request is recorded.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);

  final Future<FakeReply> Function(RequestOptions options) handler;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final reply = await handler(options);
    if (reply.networkError) throw DioException.connectionError(requestOptions: options, reason: 'offline');
    return ResponseBody.fromString(jsonEncode(reply.body), reply.status, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

class FakeReply {
  const FakeReply(this.status, [this.body = const <String, dynamic>{}]) : networkError = false;
  const FakeReply.offline()
      : status = 0,
        body = const <String, dynamic>{},
        networkError = true;

  final int status;
  final Object body;
  final bool networkError;
}

FakeReply unauthenticated() => const FakeReply(401, {
      'error': {'code': 'UNAUTHENTICATED', 'message': 'Sign in again'},
    });
