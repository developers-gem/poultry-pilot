import 'dart:async';

import 'package:dio/dio.dart';

import '../storage/token_store.dart';

/// Adds the bearer token to every request and, when the API answers 401, refreshes the session once and retries.
/// Requests that fail together share one refresh (the API rotates refresh tokens and revokes a session whose old
/// token is replayed, so two refreshes in parallel would sign the person out).
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({required this.store, required this.refreshDio, required this.onSessionExpired});

  final TokenStore store;

  /// A Dio without this interceptor, used for /auth/refresh and for retries.
  final Dio refreshDio;

  /// Called when the session cannot be refreshed: the app returns to sign-in.
  final void Function() onSessionExpired;

  Completer<bool>? _refreshing;

  static const _skipAuth = 'skipAuth';
  static const _retried = 'retried';

  /// Requests that must not carry or refresh a token (sign-in, sign-up, password reset).
  static Options get public => Options(extra: {_skipAuth: true});

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = store.accessToken;
    if (options.extra[_skipAuth] != true && token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final req = err.requestOptions;
    final unauthorised = err.response?.statusCode == 401;
    if (!unauthorised || req.extra[_skipAuth] == true || req.extra[_retried] == true) {
      return handler.next(err);
    }
    // Errors are handled one at a time (QueuedInterceptor). If another request already refreshed the session
    // since this one was sent, just retry with the new token instead of refreshing again.
    final sentWith = req.headers['Authorization'];
    final current = store.accessToken;
    final refreshed = (current != null && sentWith != 'Bearer $current') || await refresh();
    if (!refreshed) {
      // Only a refusal (tokens cleared) ends the session; offline, the refresh token is kept for later.
      if (await store.readRefreshToken() == null) onSessionExpired();
      return handler.next(err);
    }
    try {
      final retry = await refreshDio.fetch<dynamic>(
        req.copyWith(headers: {...req.headers, 'Authorization': 'Bearer ${store.accessToken}'}, extra: {...req.extra, _retried: true}),
      );
      handler.resolve(retry);
    } on DioException catch (e) {
      handler.next(e);
    }
  }

  /// Exchanges the stored refresh token for new tokens. Concurrent callers wait for the same refresh.
  Future<bool> refresh() async {
    final running = _refreshing;
    if (running != null) return running.future;
    final completer = Completer<bool>();
    _refreshing = completer;
    try {
      final token = await store.readRefreshToken();
      if (token == null) {
        completer.complete(false);
      } else {
        final res = await refreshDio.post<Map<String, dynamic>>('/auth/refresh', data: {'refreshToken': token}, options: public);
        final body = res.data!;
        await store.saveTokens(accessToken: body['accessToken'] as String, refreshToken: body['refreshToken'] as String);
        completer.complete(true);
      }
    } on DioException catch (e) {
      // A network failure is not a sign-out: keep the refresh token for when the connection returns.
      if (e.response != null) await store.clearTokens();
      completer.complete(false);
    } finally {
      _refreshing = null;
    }
    return completer.future;
  }
}
