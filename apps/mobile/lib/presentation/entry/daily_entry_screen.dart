import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../../domain/entities/daily_entry.dart';
import '../../domain/repositories/repositories.dart';
import '../session/session_controller.dart';
import 'daily_entry_view_model.dart';
import 'entry_sheets.dart';

/// Daily Entry: one flock, one day, every section a tap away. Built for one hand: the date, flock and save
/// controls sit in a dock at the bottom; sections open sheets with keypads, steppers and chips (little typing).
class DailyEntryScreen extends ConsumerStatefulWidget {
  const DailyEntryScreen({super.key, this.flockId, this.date});

  final String? flockId;
  final String? date;

  @override
  ConsumerState<DailyEntryScreen> createState() => _DailyEntryScreenState();
}

class _DailyEntryScreenState extends ConsumerState<DailyEntryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => ref.read(dailyEntryProvider.notifier).open(flockId: widget.flockId, date: widget.date));
  }

  @override
  void didUpdateWidget(DailyEntryScreen old) {
    super.didUpdateWidget(old);
    if (widget.flockId != old.flockId || widget.date != old.date) ref.read(dailyEntryProvider.notifier).open(flockId: widget.flockId, date: widget.date);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<EntryState>(dailyEntryProvider, (prev, next) {
      if (next.message != null && next.message != prev?.message) {
        showMessage(context, next.message!);
        ref.read(dailyEntryProvider.notifier).clearMessage();
      }
      if (next.error != null && next.error != prev?.error && next.draft != null) showError(context, next.error!);
    });
    final s = ref.watch(dailyEntryProvider);
    final vm = ref.read(dailyEntryProvider.notifier);
    final farm = ref.watch(sessionProvider).farm;
    final canRecord = farm?.can('production.record') ?? false;
    final sheet = s.sheet?.data;

    if (s.sheet == null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: s.error != null ? Center(child: ErrorView(error: s.error!, onRetry: () => vm.open())) : const SkeletonList(),
      );
    }
    if (sheet!.flocks.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(24), child: EmptyView(title: 'No active flocks', body: 'Place a flock (on the web app) to start daily records.')));
    }
    return Column(children: [
      Expanded(
        child: RefreshIndicator(
          onRefresh: () => vm.open(flockId: s.flockId, date: s.date),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 16), children: [
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Eyebrow('Daily entry'),
                Text(s.flock?.label ?? '', style: Theme.of(context).textTheme.headlineSmall),
                Text('${_dayLabel(s.date, sheet.today)} · ${Fmt.number(s.day?.data.birdsAlive)} birds', style: const TextStyle(color: AppColors.inkSoft)),
              ])),
              if (s.hasChanges) TextButton(onPressed: vm.discard, child: const Text('Undo all')),
            ]),
            if (s.sheet!.fromCache || (s.day?.fromCache ?? false))
              const Padding(padding: EdgeInsets.only(top: 6), child: Text("Offline: showing what this phone saved last. You can still record; it's sent later.", style: TextStyle(color: AppColors.amberInk))),
            if (s.pending.isNotEmpty) _PendingBanner(entries: s.pending, flocks: sheet.flocks),
            if (!canRecord) const Padding(padding: EdgeInsets.only(top: 8), child: Text("Your role can view today's records but not enter them.", style: TextStyle(color: AppColors.inkSoft))),
            const SizedBox(height: 12),
            if (s.draft == null) const SkeletonList(count: 3) else _Sections(state: s, enabled: canRecord),
            const SizedBox(height: 12),
            if (s.draft != null && canRecord) _Photos(state: s),
          ]),
        ),
      ),
      _Dock(state: s, canRecord: canRecord),
    ]);
  }

  static String _dayLabel(String? date, String today) {
    if (date == null) return '';
    if (date == today) return 'Today';
    final t = DateTime.parse(today);
    if (date == t.subtract(const Duration(days: 1)).toIso8601String().substring(0, 10)) return 'Yesterday';
    return Fmt.shortDate(date);
  }
}

/// The section tiles, two per row.
class _Sections extends ConsumerWidget {
  const _Sections({required this.state, required this.enabled});

  final EntryState state;
  final bool enabled;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final d = state.draft!;
    final prev = state.flock?.previous;
    final laying = state.flock?.laying ?? false;
    final vm = ref.read(dailyEntryProvider.notifier);
    String? y(num? v, String unit) => v == null ? null : 'Yesterday ${Fmt.number(v, digits: 1)} $unit';

    final tiles = <Widget>[
      _Tile(icon: Icons.grass, label: 'Feed', value: d.currentFeedKg > 0 ? '${Fmt.number(d.currentFeedKg, digits: 1)} kg' : null, hint: y(prev?.feedKg, 'kg'), changed: d.touched.contains(DaySection.feed), onTap: !enabled ? null : () async {
        final options = await ref.read(feedOptionsProvider.future).catchError((_) => <FeedOption>[]);
        if (!context.mounted) return;
        final r = await showFeedSheet(context, current: d.currentFeedKg, itemId: d.currentFeedItemId, options: options, yesterday: prev?.feedKg, otherKg: d.otherFeedKg);
        if (r != null) vm.edit((x) => x.setFeed(r.$1, r.$2));
      }),
      _Tile(icon: Icons.water_drop_outlined, label: 'Water', value: d.currentWater == null ? null : '${Fmt.number(d.currentWater)} L', hint: y(prev?.waterLitres, 'L'), changed: d.touched.contains(DaySection.water), onTap: !enabled ? null : () async {
        final r = await showWaterSheet(context, current: d.currentWater, yesterday: prev?.waterLitres);
        if (r != null) vm.edit((x) => x.setWater(r));
      }),
      _Tile(icon: Icons.heart_broken_outlined, label: 'Deaths', value: '${d.currentDeaths}${d.otherMortality > 0 ? ' (+${d.otherMortality})' : ''}', hint: prev == null ? null : 'Yesterday ${prev.mortality}', changed: d.touched.contains(DaySection.mortality), tone: d.currentDeaths > 0 ? AppColors.roseInk : null, onTap: !enabled ? null : () async {
        final r = await showDeathsSheet(context, byCause: d.currentMortality, otherDeaths: d.otherMortality);
        if (r != null) vm.edit((x) {
          for (final c in mortalityCauses) {
            x.setDeaths(c, r[c] ?? 0);
          }
        });
      }),
      if (laying)
        _Tile(icon: Icons.egg_outlined, label: 'Eggs', value: d.currentEggs == null ? null : '${Fmt.number(d.currentEggs)}${(d.currentBroken ?? 0) > 0 ? ' · ${d.currentBroken} broken' : ''}', hint: y(prev?.eggsCollected, ''), changed: d.touched.contains(DaySection.eggs), onTap: !enabled ? null : () async {
          final r = await showEggsSheet(context, collected: d.currentEggs, broken: d.currentBroken, yesterday: prev?.eggsCollected);
          if (r != null) vm.edit((x) => x.setEggs(r.$1, r.$2));
        }),
      _Tile(icon: Icons.monitor_weight_outlined, label: 'Weight', value: d.currentWeight == null ? null : '${Fmt.number(d.currentWeight)} g', hint: prev?.averageWeightG == null ? 'Weigh a sample of birds' : 'Last ${Fmt.number(prev!.averageWeightG)} g', changed: d.touched.contains(DaySection.weight), onTap: !enabled ? null : () async {
        final r = await showWeightSheet(context, grams: d.currentWeight, sample: d.weightSampleSize ?? d.base.weightSampleSize, yesterday: prev?.averageWeightG);
        if (r != null) vm.edit((x) => x.setWeight(r.$1, r.$2));
      }),
      _Tile(icon: Icons.thermostat_outlined, label: 'Temperature', value: d.currentTempMax == null && d.currentTempMin == null ? null : '${Fmt.number(d.currentTempMin, digits: 1)}–${Fmt.number(d.currentTempMax, digits: 1)} °C', changed: d.touched.contains(DaySection.temperature), onTap: !enabled ? null : () async {
        final r = await showTemperatureSheet(context, min: d.currentTempMin, max: d.currentTempMax);
        if (r != null) vm.edit((x) => x.setTemperature(r.$1, r.$2));
      }),
      _Tile(icon: Icons.cloud_outlined, label: 'Humidity', value: d.currentHumidity == null ? null : '${d.currentHumidity!.round()}%', changed: d.touched.contains(DaySection.humidity), onTap: !enabled ? null : () async {
        final r = await showHumiditySheet(context, value: d.currentHumidity);
        if (r != null) vm.edit((x) => x.setHumidity(r));
      }),
      _Tile(icon: Icons.healing_outlined, label: 'Health', value: d.currentObservations.isEmpty ? null : '${d.currentObservations.length} noted', hint: 'Tap to add what you see', changed: d.touched.contains(DaySection.health), tone: d.currentObservations.isNotEmpty ? AppColors.amberInk : null, onTap: !enabled ? null : () async {
        final r = await showHealthSheet(context);
        if (r != null) vm.edit((x) => x.addObservation(r));
      }),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      LayoutBuilder(builder: (context, c) {
        final cols = c.maxWidth > 560 ? 3 : 2;
        final w = (c.maxWidth - 10 * (cols - 1)) / cols;
        return Wrap(spacing: 10, runSpacing: 10, children: [for (final t in tiles) SizedBox(width: w, child: t)]);
      }),
      if (d.currentObservations.isNotEmpty) ...[
        const SizedBox(height: 10),
        for (var i = 0; i < d.currentObservations.length; i++)
          Card(
            elevation: 0,
            color: AppColors.amber.withValues(alpha: 0.12),
            child: ListTile(
              minTileHeight: kTarget,
              leading: const Icon(Icons.healing_outlined, color: AppColors.amberInk),
              title: Text(d.currentObservations[i].signs),
              subtitle: d.currentObservations[i].affectedBirds == null ? null : Text('${d.currentObservations[i].affectedBirds} birds'),
              trailing: enabled ? IconButton(tooltip: 'Remove', icon: const Icon(Icons.close), onPressed: () => vm.edit((x) => x.removeObservation(i))) : null,
            ),
          ),
      ],
    ]);
  }
}

/// A section: icon, label, today's value large, and yesterday's as a hint. At least 112 dp tall.
class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, this.value, this.hint, required this.changed, this.onTap, this.tone});

  final IconData icon;
  final String label;
  final String? value;
  final String? hint;
  final bool changed;
  final VoidCallback? onTap;
  final Color? tone;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: onTap != null,
      label: '$label: ${value ?? 'not recorded'}${changed ? ', changed' : ''}',
      child: Material(
        color: Colors.white.withValues(alpha: 0.82),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppTheme.radius + 4), side: BorderSide(color: changed ? AppColors.brand : Colors.white, width: changed ? 2 : 1)),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppTheme.radius + 4),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 112),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Icon(icon, size: 22, color: AppColors.brandInk),
                  const SizedBox(width: 6),
                  Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
                  if (changed) const Pill('Changed', tone: Tone.brand),
                ]),
                const SizedBox(height: 10),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(value ?? 'Tap to add', style: TextStyle(fontSize: value == null ? 16 : 24, fontWeight: value == null ? FontWeight.w500 : FontWeight.w700, color: value == null ? AppColors.inkSoft : (tone ?? AppColors.ink))),
                ),
                if (hint != null) ...[const SizedBox(height: 4), Text(hint!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.inkSoft))],
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Photo attachments: camera or gallery, resized on the phone before upload.
class _Photos extends ConsumerWidget {
  const _Photos({required this.state});

  final EntryState state;

  Future<void> _pick(BuildContext context, WidgetRef ref) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(height: kTarget, width: double.infinity, child: FilledButton.icon(onPressed: () => Navigator.pop(c, ImageSource.camera), icon: const Icon(Icons.photo_camera), label: const Text('Take a photo'))),
            const SizedBox(height: 10),
            SizedBox(height: kTarget, width: double.infinity, child: OutlinedButton.icon(onPressed: () => Navigator.pop(c, ImageSource.gallery), icon: const Icon(Icons.photo_library_outlined), label: const Text('Choose from gallery'))),
          ]),
        ),
      ),
    );
    if (source == null) return;
    try {
      // About 1600 px, JPEG 80%: clear enough for a vet, small enough for a weak connection.
      final file = await ImagePicker().pickImage(source: source, maxWidth: 1600, maxHeight: 1600, imageQuality: 80);
      if (file != null) ref.read(dailyEntryProvider.notifier).addPhoto(file.path);
    } catch (_) {
      if (context.mounted) showMessage(context, 'Could not open the camera or gallery. Check the app permissions.');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = state.day?.data.photos.length ?? 0;
    final room = 10 - saved - state.photoPaths.length;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Photos${saved > 0 ? ' · $saved already saved' : ''}', style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      SizedBox(
        height: 96,
        child: ListView(scrollDirection: Axis.horizontal, children: [
          if (room > 0)
            SizedBox(
              width: 96,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size(96, 96), padding: EdgeInsets.zero),
                onPressed: () => _pick(context, ref),
                child: const Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.add_a_photo_outlined, size: 28), SizedBox(height: 4), Text('Add photo')]),
              ),
            ),
          for (final p in state.photoPaths)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: Stack(children: [
                ClipRRect(borderRadius: BorderRadius.circular(AppTheme.radius), child: Image.file(File(p), width: 96, height: 96, fit: BoxFit.cover)),
                Positioned(
                  top: 0,
                  right: 0,
                  child: IconButton.filled(tooltip: 'Remove photo', iconSize: 18, style: IconButton.styleFrom(backgroundColor: Colors.black54), onPressed: () => ref.read(dailyEntryProvider.notifier).removePhoto(p), icon: const Icon(Icons.close)),
                ),
              ]),
            ),
        ]),
      ),
    ]);
  }
}

/// The bottom dock: date, flock (◀ ▶ and the list), and Save. Everything within thumb reach.
class _Dock extends ConsumerWidget {
  const _Dock({required this.state, required this.canRecord});

  final EntryState state;
  final bool canRecord;

  Future<bool> _confirmLeave(BuildContext context) async {
    if (!state.hasChanges) return true;
    return await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Leave without saving?'),
            content: Text('${state.changeCount} change${state.changeCount == 1 ? '' : 's'} for ${state.flock?.flockCode ?? 'this flock'} will be lost.'),
            actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Stay')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Leave'))],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vm = ref.read(dailyEntryProvider.notifier);
    final sheet = state.sheet!.data;
    final today = sheet.today;
    final yesterday = DateTime.parse(today).subtract(const Duration(days: 1)).toIso8601String().substring(0, 10);
    final remaining = sheet.flocks.where((f) => !f.isRecorded && f.flockId != state.flockId).length;
    final canEditAny = ref.watch(sessionProvider).farm?.can('production.edit_any') ?? false;

    Future<void> goFlock(String? id) async {
      if (id == null || id == state.flockId || !await _confirmLeave(context)) return;
      await vm.selectFlock(id);
    }

    Future<void> goDate(String date) async {
      if (date == state.date || !await _confirmLeave(context)) return;
      await vm.selectDate(date);
    }

    return Material(
      color: Colors.white.withValues(alpha: 0.94),
      elevation: 8,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Row(children: [
            ChoiceChip(label: const Text('Yesterday'), selected: state.date == yesterday, onSelected: (_) => goDate(yesterday), padding: const EdgeInsets.symmetric(vertical: 10)),
            const SizedBox(width: 6),
            ChoiceChip(label: const Text('Today'), selected: state.date == today, onSelected: (_) => goDate(today), padding: const EdgeInsets.symmetric(vertical: 10)),
            IconButton(
              tooltip: 'Pick a date',
              iconSize: 26,
              constraints: const BoxConstraints(minWidth: kTarget, minHeight: kTarget),
              onPressed: () async {
                final first = canEditAny ? DateTime.parse(today).subtract(const Duration(days: 90)) : DateTime.parse(sheet.editWindowStart);
                final picked = await showDatePicker(context: context, initialDate: DateTime.parse(state.date ?? today), firstDate: first, lastDate: DateTime.parse(today));
                if (picked != null) await goDate(picked.toIso8601String().substring(0, 10));
              },
              icon: const Icon(Icons.calendar_month_outlined),
            ),
            const Spacer(),
            IconButton(tooltip: 'Previous flock', iconSize: 30, constraints: const BoxConstraints(minWidth: kTarget, minHeight: kTarget), onPressed: () => goFlock(vm.neighbour(-1)), icon: const Icon(Icons.chevron_left)),
            Flexible(
              child: ActionChip(
                avatar: Icon(state.flock?.isRecorded ?? false ? Icons.check_circle : Icons.radio_button_unchecked, color: state.flock?.isRecorded ?? false ? AppColors.mintInk : AppColors.inkSoft),
                label: Text(state.flock?.flockCode ?? 'Flock', overflow: TextOverflow.ellipsis),
                padding: const EdgeInsets.symmetric(vertical: 10),
                onPressed: () async {
                  final id = await _pickFlock(context, sheet.flocks, state.flockId);
                  await goFlock(id);
                },
              ),
            ),
            IconButton(tooltip: 'Next flock', iconSize: 30, constraints: const BoxConstraints(minWidth: kTarget, minHeight: kTarget), onPressed: () => goFlock(vm.neighbour(1)), icon: const Icon(Icons.chevron_right)),
          ]),
          if (canRecord) ...[
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: SizedBox(
                  height: kTarget,
                  child: FilledButton(
                    onPressed: state.hasChanges && !state.saving ? () => vm.save() : null,
                    child: state.saving ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(state.hasChanges ? 'Save ${state.changeCount} change${state.changeCount == 1 ? '' : 's'}' : 'Nothing to save', style: const TextStyle(fontSize: 17)),
                  ),
                ),
              ),
              if (remaining > 0) ...[
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: kTarget,
                    child: OutlinedButton(onPressed: state.hasChanges && !state.saving ? () => vm.save(next: true) : () => goFlock(vm.neighbour(1, onlyUnrecorded: true)), child: Text(state.hasChanges ? 'Save & next' : 'Next to do ($remaining)')),
                  ),
                ),
              ],
            ]),
          ],
        ]),
      ),
    );
  }

  static Future<String?> _pickFlock(BuildContext context, List<SheetFlock> flocks, String? current) => showModalBottomSheet<String>(
        context: context,
        showDragHandle: true,
        isScrollControlled: true,
        builder: (c) => SafeArea(
          child: ListView(shrinkWrap: true, children: [
            for (final f in flocks)
              ListTile(
                minTileHeight: 64,
                selected: f.flockId == current,
                leading: Icon(f.isRecorded ? Icons.check_circle : Icons.radio_button_unchecked, color: f.isRecorded ? AppColors.mintInk : AppColors.inkSoft),
                title: Text(f.flockCode, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
                subtitle: Text('${f.houseName ?? ''} · ${Fmt.number(f.expectedBirds)} birds · ${f.isRecorded ? 'recorded' : 'to do'}'),
                onTap: () => Navigator.pop(c, f.flockId),
              ),
          ]),
        ),
      );
}

/// Entries saved on this phone while offline, and any that need a decision.
class _PendingBanner extends ConsumerWidget {
  const _PendingBanner({required this.entries, required this.flocks});

  final List<PendingEntry> entries;
  final List<SheetFlock> flocks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conflicts = entries.where((e) => e.status != 'waiting').toList();
    final vm = ref.read(dailyEntryProvider.notifier);
    final code = (String id) => flocks.where((f) => f.flockId == id).firstOrNull?.flockCode ?? 'Flock';
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.cloud_upload_outlined, color: AppColors.amberInk),
            const SizedBox(width: 8),
            Expanded(child: Text('${entries.length} entr${entries.length == 1 ? 'y' : 'ies'} saved on this phone', style: const TextStyle(fontWeight: FontWeight.w600))),
            TextButton(onPressed: vm.syncNow, child: const Text('Send now')),
          ]),
          for (final e in conflicts)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${code(e.flockId)} · ${Fmt.shortDate(e.date)}: ${e.error ?? 'needs your decision'}', style: const TextStyle(color: AppColors.roseInk)),
                if (e.status == 'conflict')
                  Row(children: [
                    TextButton(onPressed: () => vm.resolve(e.id, sendAnyway: true), child: const Text('Send mine anyway')),
                    TextButton(onPressed: () => vm.resolve(e.id, sendAnyway: false), child: const Text('Discard mine')),
                  ])
                else
                  TextButton(onPressed: () => vm.resolve(e.id, sendAnyway: false), child: const Text('Remove')),
              ]),
            ),
        ]),
      ),
    );
  }
}
