import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import '../../domain/entities/daily_entry.dart';
import '../../domain/entities/dashboard.dart';
import '../../domain/repositories/repositories.dart';
import '../session/session_controller.dart';
import '../sync/sync_controller.dart';

/// State of the Daily Entry screen. The draft is mutable for speed; [revision] changes on every edit.
class EntryState {
  const EntryState({
    this.date,
    this.flockId,
    this.sheet,
    this.day,
    this.draft,
    this.photoPaths = const [],
    this.loading = false,
    this.saving = false,
    this.error,
    this.message,
    this.revision = 0,
  });

  final String? date;
  final String? flockId;
  final Cached<DailySheet>? sheet;
  final Cached<DayRecord>? day;
  final DayDraft? draft;
  final List<String> photoPaths;
  final bool loading;
  final bool saving;
  final Object? error;

  /// A one-off note for the screen ("Saved", "Saved on this phone…").
  final String? message;
  final int revision;

  SheetFlock? get flock => sheet?.data.flocks.where((f) => f.flockId == flockId).firstOrNull;
  bool get hasChanges => (draft?.hasChanges ?? false) || photoPaths.isNotEmpty;
  int get changeCount => (draft?.touched.length ?? 0) + (photoPaths.isNotEmpty ? 1 : 0);

  EntryState copyWith({
    String? date,
    String? flockId,
    Cached<DailySheet>? sheet,
    Cached<DayRecord>? day,
    DayDraft? draft,
    List<String>? photoPaths,
    bool? loading,
    bool? saving,
    Object? error,
    bool clearError = false,
    String? message,
    bool clearMessage = false,
  }) =>
      EntryState(
        date: date ?? this.date,
        flockId: flockId ?? this.flockId,
        sheet: sheet ?? this.sheet,
        day: day ?? this.day,
        draft: draft ?? this.draft,
        photoPaths: photoPaths ?? this.photoPaths,
        loading: loading ?? this.loading,
        saving: saving ?? this.saving,
        error: clearError ? null : (error ?? this.error),
        message: clearMessage ? null : (message ?? this.message),
        revision: revision + 1,
      );
}

/// View model for Daily Entry. Kept alive across tabs so an unfinished entry is not lost.
class DailyEntryViewModel extends Notifier<EntryState> {
  @override
  EntryState build() {
    ref.listen(sessionProvider.select((s) => s.farm?.farmId), (prev, next) {
      if (prev != next) state = const EntryState();
    });
    return const EntryState();
  }

  String? get _farmId => ref.read(sessionProvider).farm?.farmId;
  DailyEntryRepository get _repo => ref.read(dailyEntryRepositoryProvider);

  /// Opens the screen: today's sheet, then the requested flock or the first one still to record.
  Future<void> open({String? flockId, String? date}) async {
    final farmId = _farmId;
    if (farmId == null) return;
    if (state.sheet != null && flockId == null && date == null) return;
    state = state.copyWith(loading: true, clearError: true);
    try {
      // Without a date the API answers for today in the farm's time zone (not the phone's).
      final sheet = await _repo.sheet(farmId, date ?? state.date);
      final flocks = sheet.data.flocks;
      final chosen = flockId ?? state.flockId ?? flocks.where((f) => !f.isRecorded).firstOrNull?.flockId ?? flocks.firstOrNull?.flockId;
      state = state.copyWith(sheet: sheet, date: sheet.data.date, flockId: chosen, loading: false);
      if (chosen != null) await _loadDay();
    } catch (e) {
      state = state.copyWith(loading: false, error: e);
    }
  }

  Future<void> selectDate(String date) async {
    final farmId = _farmId;
    if (farmId == null) return;
    state = state.copyWith(loading: true, date: date, clearError: true);
    try {
      final sheet = await _repo.sheet(farmId, date);
      state = state.copyWith(sheet: sheet, loading: false);
      await _loadDay();
    } catch (e) {
      state = state.copyWith(loading: false, error: e);
    }
  }

  Future<void> selectFlock(String flockId) async {
    state = EntryState(date: state.date, flockId: flockId, sheet: state.sheet, revision: state.revision + 1);
    await _loadDay();
  }

  /// The next flock (wrapping), for the ◀ ▶ buttons and "Save & next".
  String? neighbour(int step, {bool onlyUnrecorded = false}) {
    final list = state.sheet?.data.flocks ?? const <SheetFlock>[];
    if (list.isEmpty) return null;
    final n = list.length;
    final i = list.indexWhere((f) => f.flockId == state.flockId);
    for (var k = 1; k <= n; k++) {
      final f = list[((i + step * k) % n + n) % n];
      if (!onlyUnrecorded || !f.isRecorded) return f.flockId;
    }
    return null;
  }

  Future<void> _loadDay() async {
    final farmId = _farmId;
    final flockId = state.flockId;
    final date = state.date;
    if (farmId == null || flockId == null || date == null) return;
    state = state.copyWith(loading: true, clearError: true);
    try {
      final day = await _repo.day(farmId, flockId, date);
      state = state.copyWith(day: day, draft: DayDraft(day.data), photoPaths: const [], loading: false);
    } catch (e) {
      state = state.copyWith(loading: false, error: e);
    }
  }

  /// Applies an edit to the draft and refreshes the screen.
  void edit(void Function(DayDraft d) change) {
    final d = state.draft;
    if (d == null) return;
    change(d);
    state = state.copyWith();
  }

  void addPhoto(String path) => state = state.copyWith(photoPaths: [...state.photoPaths, path]);
  void removePhoto(String path) => state = state.copyWith(photoPaths: state.photoPaths.where((p) => p != path).toList());
  void clearMessage() => state = state.copyWith(clearMessage: true);

  void discard() {
    final day = state.day;
    if (day != null) state = state.copyWith(draft: DayDraft(day.data), photoPaths: const []);
  }

  /// Saves the touched sections on the phone (always works, offline too); the sync queue sends them.
  Future<bool> save({bool next = false}) async {
    final farmId = _farmId;
    final draft = state.draft;
    final session = ref.read(sessionProvider);
    final userId = session is SessionSignedIn ? session.account.user.id : null;
    if (farmId == null || userId == null || draft == null || state.flockId == null || state.date == null || !state.hasChanges) return false;
    state = state.copyWith(saving: true, clearError: true);
    try {
      await _repo.save(userId: userId, farmId: farmId, draft: draft, photoPaths: state.photoPaths);
      final online = ref.read(syncControllerProvider).online;
      state = state.copyWith(saving: false, message: online ? 'Saved. Sending to the farm…' : "Saved on this phone. It's sent when you're back online.");
      final sheet = await _repo.sheet(farmId, state.date!).catchError((_) => state.sheet!);
      state = state.copyWith(sheet: sheet);
      final target = next ? neighbour(1, onlyUnrecorded: true) : null;
      if (target != null && target != state.flockId) {
        await selectFlock(target);
      } else {
        await _loadDay();
      }
      // Send now if possible (does not block the farmer).
      ref.read(syncControllerProvider.notifier).changed();
      return true;
    } catch (e) {
      state = state.copyWith(saving: false, error: e);
      return false;
    }
  }
}

final dailyEntryProvider = NotifierProvider<DailyEntryViewModel, EntryState>(DailyEntryViewModel.new);

/// Feed choices for the farm (cached for offline use).
final feedOptionsProvider = FutureProvider.autoDispose<List<FeedOption>>((ref) async {
  final farmId = ref.watch(sessionProvider.select((s) => s.farm?.farmId));
  if (farmId == null) return const [];
  return ref.watch(dailyEntryRepositoryProvider).feedOptions(farmId);
});
