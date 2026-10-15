import 'dart:io';
import 'dart:math';

import 'package:path_provider/path_provider.dart';

/// Keeps photos waiting to be uploaded in the app's own storage (camera files can be cleared by the system).
abstract class PhotoStore {
  Future<String> keep(String sourcePath);
  Future<List<int>> read(String path);
  Future<void> delete(String path);
}

class FilePhotoStore implements PhotoStore {
  @override
  Future<String> keep(String sourcePath) async {
    final dir = Directory('${(await getApplicationDocumentsDirectory()).path}/pending_photos');
    await dir.create(recursive: true);
    final name = '${DateTime.now().microsecondsSinceEpoch}_${Random().nextInt(1 << 20)}.jpg';
    return (await File(sourcePath).copy('${dir.path}/$name')).path;
  }

  @override
  Future<List<int>> read(String path) => File(path).readAsBytes();

  @override
  Future<void> delete(String path) async {
    final f = File(path);
    if (await f.exists()) await f.delete();
  }
}

/// Content type from the file name (the API checks the bytes as well).
String photoContentType(String path) {
  final p = path.toLowerCase();
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}
