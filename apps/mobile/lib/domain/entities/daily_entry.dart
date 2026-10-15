import 'package:freezed_annotation/freezed_annotation.dart';

part 'daily_entry.freezed.dart';

/// GET /daily-records/sheet: every active flock with today's record (if any) and yesterday's figures.
@freezed
class DailySheet with _$DailySheet {
  const factory DailySheet({required String date, required String today, required String editWindowStart, @Default(<SheetFlock>[]) List<SheetFlock> flocks}) = _DailySheet;
}

@freezed
class SheetFlock with _$SheetFlock {
  const SheetFlock._();

  const factory SheetFlock({
    required String flockId,
    required String flockCode,
    required String name,
    required String type,
    required String houseId,
    String? houseName,
    required int expectedBirds,
    required bool laying,
    DaySummary? recorded,
    DaySummary? previous,

    /// Changes for this flock and day are saved on the phone and not yet on the server.
    @Default(false) bool pendingSync,
  }) = _SheetFlock;

  bool get isRecorded => recorded != null || pendingSync;
  String get label => houseName == null ? flockCode : '$flockCode · $houseName';
}

@freezed
class DaySummary with _$DaySummary {
  const factory DaySummary({required int mortality, required int culls, required double feedKg, double? waterLitres, int? eggsCollected, int? eggsBroken, double? averageWeightG, required int observations, required int photos}) = _DaySummary;
}

/// One flock's day as the API holds it (GET /flocks/:id/daily-records/:date).
@freezed
class DayRecord with _$DayRecord {
  const factory DayRecord({
    String? id,
    int? version,
    required String flockId,
    required String date,
    required int birdsAlive,
    @Default(<MortalityLine>[]) List<MortalityLine> mortality,
    @Default(<FeedLine>[]) List<FeedLine> feed,
    double? waterLitres,
    double? temperatureMinC,
    double? temperatureMaxC,
    double? humidityPercent,
    int? eggsCollected,
    int? eggsBroken,
    double? averageWeightG,
    int? weightSampleSize,
    @Default(<Observation>[]) List<Observation> observations,
    @Default(<PhotoRef>[]) List<PhotoRef> photos,
  }) = _DayRecord;
}

@freezed
class MortalityLine with _$MortalityLine {
  const factory MortalityLine({required String cause, required int count, required bool fromDailyRecord}) = _MortalityLine;
}

@freezed
class FeedLine with _$FeedLine {
  const factory FeedLine({String? feedItemId, required double quantityKg, required String kind, required bool fromDailyRecord}) = _FeedLine;
}

@freezed
class Observation with _$Observation {
  const factory Observation({required String signs, int? affectedBirds}) = _Observation;
}

@freezed
class PhotoRef with _$PhotoRef {
  const factory PhotoRef({required String assetId, String? caption, String? url}) = _PhotoRef;
}

/// A feed the farmer can pick (from the farm's feed stock).
@freezed
class FeedOption with _$FeedOption {
  const factory FeedOption({required String itemId, required String name, required double quantityKg}) = _FeedOption;
}

/// The sections of a day, in the order the entry screen shows them.
enum DaySection { feed, water, mortality, eggs, weight, temperature, humidity, health }

/// The API's death causes.
const mortalityCauses = ['unknown', 'found_dead', 'heat_stress', 'predator', 'injury', 'suspected_disease', 'other'];

/// Signs farmers report most; tapping chips beats typing. Free text is still allowed.
const commonSigns = ['Coughing', 'Sneezing', 'Watery droppings', 'Bloody droppings', 'Not eating', 'Drinking less', 'Lethargic', 'Swollen face', 'Twisted neck', 'Lameness', 'Feather loss', 'Pale comb'];

/// The farmer's changes to one flock's day, before saving. Only touched sections are sent (PATCH), so saving the
/// eggs never changes the feed someone else entered. Pure Dart: tested without Flutter.
class DayDraft {
  DayDraft(this.base);

  /// The day as last loaded from the API.
  final DayRecord base;
  final Set<DaySection> touched = {};

  double? feedKg;
  String? feedItemId;
  double? waterLitres;

  /// Deaths in this record by cause (record-owned only; deaths entered elsewhere are not editable here).
  Map<String, int>? mortalityByCause;
  int? eggsCollected;
  int? eggsBroken;
  double? averageWeightG;
  int? weightSampleSize;
  double? temperatureMinC;
  double? temperatureMaxC;
  double? humidityPercent;
  List<Observation>? observations;

  /// Assets uploaded for this save (added to the day's photos).
  final List<PhotoRef> newPhotos = [];

  bool get hasChanges => touched.isNotEmpty || newPhotos.isNotEmpty;
  int get changeCount => touched.length + (newPhotos.isNotEmpty ? 1 : 0);

  // ---- what the day currently shows (draft value if touched, else the record's) -------------------------

  /// Feed in this record; feed entered elsewhere (FeedWise) is added on top and not editable here.
  double get recordFeedKg => base.feed.where((f) => f.fromDailyRecord).fold(0.0, (t, f) => t + f.quantityKg);
  double get otherFeedKg => base.feed.where((f) => !f.fromDailyRecord && f.kind == 'consumption').fold(0.0, (t, f) => t + f.quantityKg);
  double get currentFeedKg => touched.contains(DaySection.feed) ? (feedKg ?? 0) : recordFeedKg;
  String? get currentFeedItemId => touched.contains(DaySection.feed) ? feedItemId : base.feed.where((f) => f.fromDailyRecord).map((f) => f.feedItemId).firstOrNull;

  Map<String, int> get recordMortality {
    final m = <String, int>{};
    for (final l in base.mortality.where((l) => l.fromDailyRecord)) {
      m[l.cause] = (m[l.cause] ?? 0) + l.count;
    }
    return m;
  }

  int get otherMortality => base.mortality.where((l) => !l.fromDailyRecord).fold(0, (t, l) => t + l.count);
  Map<String, int> get currentMortality => mortalityByCause ?? recordMortality;
  int get currentDeaths => currentMortality.values.fold(0, (a, b) => a + b);

  double? get currentWater => touched.contains(DaySection.water) ? waterLitres : base.waterLitres;
  int? get currentEggs => touched.contains(DaySection.eggs) ? eggsCollected : base.eggsCollected;
  int? get currentBroken => touched.contains(DaySection.eggs) ? eggsBroken : base.eggsBroken;
  double? get currentWeight => touched.contains(DaySection.weight) ? averageWeightG : base.averageWeightG;
  double? get currentTempMin => touched.contains(DaySection.temperature) ? temperatureMinC : base.temperatureMinC;
  double? get currentTempMax => touched.contains(DaySection.temperature) ? temperatureMaxC : base.temperatureMaxC;
  double? get currentHumidity => touched.contains(DaySection.humidity) ? humidityPercent : base.humidityPercent;
  List<Observation> get currentObservations => observations ?? base.observations;

  // ---- edits -----------------------------------------------------------------------------------------

  void setFeed(double kg, String? itemId) {
    feedKg = kg;
    feedItemId = itemId;
    touched.add(DaySection.feed);
  }

  void setWater(double litres) {
    waterLitres = litres;
    touched.add(DaySection.water);
  }

  void setDeaths(String cause, int count) {
    final m = Map<String, int>.from(currentMortality);
    if (count <= 0) {
      m.remove(cause);
    } else {
      m[cause] = count;
    }
    mortalityByCause = m;
    touched.add(DaySection.mortality);
  }

  void setEggs(int collected, int broken) {
    eggsCollected = collected;
    eggsBroken = broken;
    touched.add(DaySection.eggs);
  }

  void setWeight(double grams, int? sampleSize) {
    averageWeightG = grams;
    weightSampleSize = sampleSize;
    touched.add(DaySection.weight);
  }

  void setTemperature(double? min, double? max) {
    temperatureMinC = min;
    temperatureMaxC = max;
    touched.add(DaySection.temperature);
  }

  void setHumidity(double percent) {
    humidityPercent = percent;
    touched.add(DaySection.humidity);
  }

  void addObservation(Observation o) {
    observations = [...currentObservations, o];
    touched.add(DaySection.health);
  }

  void removeObservation(int index) {
    final list = [...currentObservations]..removeAt(index);
    observations = list;
    touched.add(DaySection.health);
  }

  /// The same edits on a newer copy of the day (after someone else saved it), so nothing typed is lost.
  DayDraft rebase(DayRecord newer) {
    final d = DayDraft(newer)
      ..feedKg = feedKg
      ..feedItemId = feedItemId
      ..waterLitres = waterLitres
      ..mortalityByCause = mortalityByCause
      ..eggsCollected = eggsCollected
      ..eggsBroken = eggsBroken
      ..averageWeightG = averageWeightG
      ..weightSampleSize = weightSampleSize
      ..temperatureMinC = temperatureMinC
      ..temperatureMaxC = temperatureMaxC
      ..humidityPercent = humidityPercent
      ..observations = observations;
    d.touched.addAll(touched);
    d.newPhotos.addAll(newPhotos);
    return d;
  }

  /// The PATCH body: only the sections touched, plus the version when the day already exists.
  Map<String, dynamic> toPatch() {
    final body = <String, dynamic>{};
    if (touched.contains(DaySection.feed)) {
      body['feed'] = (feedKg ?? 0) > 0 ? [{'quantityKg': feedKg, if (feedItemId != null) 'feedItemId': feedItemId}] : <Map<String, dynamic>>[];
    }
    if (touched.contains(DaySection.water) && waterLitres != null) body['waterLitres'] = waterLitres;
    if (touched.contains(DaySection.mortality)) {
      body['mortality'] = [for (final e in currentMortality.entries) if (e.value > 0) {'cause': e.key, 'count': e.value}];
    }
    if (touched.contains(DaySection.eggs) && eggsCollected != null) body['eggs'] = {'collected': eggsCollected, 'broken': eggsBroken ?? 0};
    if (touched.contains(DaySection.weight) && averageWeightG != null) {
      body['averageWeight'] = {'averageWeightG': averageWeightG, if (weightSampleSize != null) 'sampleSize': weightSampleSize};
    }
    if (touched.contains(DaySection.temperature)) {
      if (temperatureMinC != null) body['temperatureMinC'] = temperatureMinC;
      if (temperatureMaxC != null) body['temperatureMaxC'] = temperatureMaxC;
    }
    if (touched.contains(DaySection.humidity) && humidityPercent != null) body['humidityPercent'] = humidityPercent;
    if (touched.contains(DaySection.health)) {
      body['healthObservations'] = [for (final o in currentObservations) {'signs': o.signs, if (o.affectedBirds != null) 'affectedBirds': o.affectedBirds}];
    }
    if (newPhotos.isNotEmpty) {
      body['photos'] = [for (final p in [...base.photos, ...newPhotos].take(10)) {'assetId': p.assetId, if (p.caption != null) 'caption': p.caption}];
    }
    if (base.version != null) body['version'] = base.version;
    return body;
  }
}
