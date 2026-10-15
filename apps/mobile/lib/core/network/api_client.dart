import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../error/app_exception.dart';
import '../storage/token_store.dart';
import 'auth_interceptor.dart';

/// The one HTTP client for the PoultryPilot API (the same /api/v1 the web app uses).
class ApiClient {
  ApiClient({required TokenStore store, required void Function() onSessionExpired, String? baseUrl, HttpClientAdapter? adapter}) {
    BaseOptions options() => BaseOptions(
          baseUrl: '${baseUrl ?? AppConfig.apiBaseUrl}${AppConfig.apiPrefix}',
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 30),
          contentType: Headers.jsonContentType,
          responseType: ResponseType.json,
          headers: {'Accept': 'application/json'},
        );
    final plain = Dio(options());
    dio = Dio(options());
    if (adapter != null) {
      plain.httpClientAdapter = adapter;
      dio.httpClientAdapter = adapter;
    }
    interceptor = AuthInterceptor(store: store, refreshDio: plain, onSessionExpired: onSessionExpired);
    dio.interceptors.add(interceptor);
  }

  late final Dio dio;
  late final AuthInterceptor interceptor;

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) => _send(() => dio.get<dynamic>(path, queryParameters: query));

  Future<Map<String, dynamic>> post(String path, {Object? data, bool public = false}) => _send(() => dio.post<dynamic>(path, data: data ?? const <String, dynamic>{}, options: public ? AuthInterceptor.public : null));

  Future<Map<String, dynamic>> put(String path, {Object? data}) => _send(() => dio.put<dynamic>(path, data: data));

  Future<Map<String, dynamic>> patch(String path, {Object? data}) => _send(() => dio.patch<dynamic>(path, data: data));

  /// Uploads raw bytes (a photo) with its content type.
  Future<Map<String, dynamic>> postBytes(String path, List<int> bytes, String contentType) => _send(
        () => dio.post<dynamic>(path, data: Stream.fromIterable([bytes]), options: Options(contentType: contentType, headers: {Headers.contentLengthHeader: bytes.length})),
      );

  Future<void> delete(String path) async {
    await _send(() => dio.delete<dynamic>(path));
  }

  /// Runs a request and turns every failure into an [AppException]. An empty body (204) becomes an empty map.
  Future<Map<String, dynamic>> _send(Future<Response<dynamic>> Function() run) async {
    try {
      final res = await run();
      final data = res.data;
      if (data is Map<String, dynamic>) return data;
      if (data is Map) return data.cast<String, dynamic>();
      return const <String, dynamic>{};
    } on DioException catch (e) {
      throw AppException.fromDio(e);
    }
  }
}
