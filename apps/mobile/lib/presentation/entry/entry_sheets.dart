import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../domain/entities/daily_entry.dart';

/// Touch target sizes for one-handed use with gloves or wet hands (Material minimum is 48 dp).
const kTarget = 56.0;
const kKey = 64.0;

void _tick() => HapticFeedback.selectionClick();

/// A bottom sheet in the thumb zone: drag handle, title, content, and a full-width Done button at the bottom.
Future<T?> showEntrySheet<T>(BuildContext context, {required String title, required Widget Function(BuildContext, StateSetter) builder, required T? Function() onDone, String done = 'Done'}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) => Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.viewInsetsOf(ctx).bottom),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(title, style: Theme.of(ctx).textTheme.titleLarge),
          const SizedBox(height: 12),
          Flexible(child: SingleChildScrollView(child: builder(ctx, setState))),
          const SizedBox(height: 12),
          SizedBox(height: kTarget, child: FilledButton(onPressed: () => Navigator.pop(ctx, onDone()), child: Text(done, style: const TextStyle(fontSize: 18)))),
        ]),
      ),
    ),
  );
}

/// Big digits and a 3×4 keypad (no system keyboard, nothing jumps around).
class NumberPad extends StatelessWidget {
  const NumberPad({super.key, required this.text, required this.onChanged, this.decimal = true, this.unit, this.maxLength = 7});

  final String text;
  final ValueChanged<String> onChanged;
  final bool decimal;
  final String? unit;
  final int maxLength;

  void _press(String k) {
    _tick();
    if (k == '⌫') {
      onChanged(text.isEmpty ? '' : text.substring(0, text.length - 1));
    } else if (k == '.') {
      if (decimal && !text.contains('.')) onChanged(text.isEmpty ? '0.' : '$text.');
    } else if (text.length < maxLength) {
      onChanged(text == '0' ? k : '$text$k');
    }
  }

  @override
  Widget build(BuildContext context) {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', decimal ? '.' : '', '0', '⌫'];
    return Column(children: [
      Container(
        height: 72,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(AppTheme.radius)),
        child: Text.rich(
          TextSpan(children: [
            TextSpan(text: text.isEmpty ? '0' : text, style: TextStyle(fontSize: 40, fontWeight: FontWeight.w700, color: text.isEmpty ? AppColors.inkSoft : AppColors.ink)),
            if (unit != null) TextSpan(text: '  $unit', style: const TextStyle(fontSize: 20, color: AppColors.inkSoft)),
          ]),
          semanticsLabel: '${text.isEmpty ? '0' : text} ${unit ?? ''}',
        ),
      ),
      const SizedBox(height: 10),
      GridView.count(
        crossAxisCount: 3,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 2.1,
        children: [
          for (final k in keys)
            k.isEmpty
                ? const SizedBox.shrink()
                : Material(
                    color: k == '⌫' ? AppColors.line : Colors.white,
                    borderRadius: BorderRadius.circular(AppTheme.radius),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppTheme.radius),
                      onTap: () => _press(k),
                      onLongPress: k == '⌫' ? () => onChanged('') : null,
                      child: Center(child: Text(k, semanticsLabel: k == '⌫' ? 'Delete' : k, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w600))),
                    ),
                  ),
        ],
      ),
    ]);
  }
}

/// Large chips that fill in a value in one tap (e.g. "Same as yesterday").
class QuickChips extends StatelessWidget {
  const QuickChips({super.key, required this.items, required this.onPick});

  final List<(String, num)> items;
  final ValueChanged<num> onPick;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Wrap(spacing: 8, runSpacing: 8, children: [
        for (final (label, v) in items)
          ActionChip(
            label: Text(label, style: const TextStyle(fontSize: 15)),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            onPressed: () {
              _tick();
              onPick(v);
            },
          ),
      ]),
    );
  }
}

/// − value + with 56 dp round buttons.
class BigStepper extends StatelessWidget {
  const BigStepper({super.key, required this.label, required this.value, required this.onChanged, this.step = 1, this.min = 0, this.max = 1000000, this.format});

  final String label;
  final num value;
  final ValueChanged<num> onChanged;
  final num step;
  final num min;
  final num max;
  final String Function(num)? format;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, num delta, String hint) => SizedBox(
          width: kTarget,
          height: kTarget,
          child: IconButton.filledTonal(
            tooltip: hint,
            iconSize: 28,
            onPressed: () {
              final n = value + delta;
              if (n < min || n > max) return;
              _tick();
              onChanged(n);
            },
            icon: Icon(icon),
          ),
        );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
        btn(Icons.remove, -step, 'Less'),
        SizedBox(width: 84, child: Text(format?.call(value) ?? Fmt.number(value, digits: 1), textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700))),
        btn(Icons.add, step, 'More'),
      ]),
    );
  }
}

String _str(num? v) => v == null || v == 0 ? '' : (v % 1 == 0 ? v.toInt().toString() : v.toString());

/// Feed: pick the feed (chips), then the kilograms. Yesterday's amount is one tap away.
Future<(double, String?)?> showFeedSheet(BuildContext context, {required double current, String? itemId, required List<FeedOption> options, double? yesterday, double otherKg = 0}) {
  var text = _str(current);
  var chosen = itemId ?? options.firstOrNull?.itemId;
  return showEntrySheet(context, title: 'Feed given today', onDone: () => (double.tryParse(text) ?? 0, chosen), builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (options.isNotEmpty)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              for (final o in options)
                Padding(
                  padding: const EdgeInsets.only(right: 8, bottom: 10),
                  child: ChoiceChip(label: Text('${o.name} · ${Fmt.number(o.quantityKg)} kg left'), selected: chosen == o.itemId, onSelected: (_) => set(() => chosen = o.itemId)),
                ),
            ]),
          ),
        if (otherKg > 0) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('${Fmt.number(otherKg, digits: 1)} kg more was entered separately today (FeedWise).', style: const TextStyle(color: AppColors.inkSoft))),
        QuickChips(items: [if (yesterday != null && yesterday > 0) ('Same as yesterday (${Fmt.number(yesterday, digits: 1)} kg)', yesterday), if (yesterday != null && yesterday > 0) ('+5%', (yesterday * 1.05).roundToDouble())], onPick: (v) => set(() => text = _str(v))),
        NumberPad(text: text, unit: 'kg', onChanged: (t) => set(() => text = t)),
      ]));
}

/// Water in litres.
Future<double?> showWaterSheet(BuildContext context, {double? current, double? yesterday}) {
  var text = _str(current);
  return showEntrySheet(context, title: 'Water drunk today', onDone: () => double.tryParse(text), builder: (ctx, set) => Column(children: [
        QuickChips(items: [if (yesterday != null && yesterday > 0) ('Same as yesterday (${Fmt.number(yesterday)} L)', yesterday)], onPick: (v) => set(() => text = _str(v))),
        NumberPad(text: text, unit: 'L', onChanged: (t) => set(() => text = t)),
      ]));
}

/// Eggs: collected (including broken) and broken, on one keypad.
Future<(int, int)?> showEggsSheet(BuildContext context, {int? collected, int? broken, int? yesterday}) {
  var c = _str(collected);
  var b = _str(broken);
  var editing = 0; // 0 collected, 1 broken
  return showEntrySheet(context, title: 'Eggs collected', onDone: () => c.isEmpty ? null : (int.tryParse(c) ?? 0, int.tryParse(b) ?? 0), builder: (ctx, set) => Column(children: [
        SegmentedButton<int>(
          segments: const [ButtonSegment(value: 0, label: Text('Collected')), ButtonSegment(value: 1, label: Text('Broken'))],
          selected: {editing},
          style: const ButtonStyle(minimumSize: WidgetStatePropertyAll(Size(0, kTarget))),
          onSelectionChanged: (s) => set(() => editing = s.first),
        ),
        const SizedBox(height: 10),
        if (editing == 0) QuickChips(items: [if (yesterday != null && yesterday > 0) ('Same as yesterday ($yesterday)', yesterday)], onPick: (v) => set(() => c = _str(v))),
        NumberPad(text: editing == 0 ? c : b, decimal: false, unit: editing == 0 ? 'eggs' : 'broken', onChanged: (t) => set(() {
              if (editing == 0) {
                c = t;
              } else {
                b = t;
              }
            })),
        const SizedBox(height: 6),
        Text('Collected ${c.isEmpty ? '0' : c} · broken ${b.isEmpty ? '0' : b}', style: const TextStyle(color: AppColors.inkSoft)),
      ]));
}

/// Deaths: a counter per cause (tap +/−); no typing.
Future<Map<String, int>?> showDeathsSheet(BuildContext context, {required Map<String, int> byCause, int otherDeaths = 0}) {
  final counts = {for (final c in mortalityCauses) c: byCause[c] ?? 0};
  return showEntrySheet(context, title: 'Deaths today', onDone: () => Map.of(counts), builder: (ctx, set) => Column(children: [
        if (otherDeaths > 0) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('$otherDeaths more recorded elsewhere today.', style: const TextStyle(color: AppColors.inkSoft))),
        for (final c in mortalityCauses) BigStepper(label: Fmt.label(c), value: counts[c]!, format: (v) => '${v.toInt()}', onChanged: (v) => set(() => counts[c] = v.toInt())),
        const SizedBox(height: 6),
        Text('Total ${counts.values.fold(0, (a, b) => a + b)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
      ]));
}

/// Average weight in grams, with how many birds were weighed.
Future<(double, int?)?> showWeightSheet(BuildContext context, {double? grams, int? sample, double? yesterday}) {
  var text = _str(grams);
  num birds = sample ?? 10;
  return showEntrySheet(context, title: 'Average bird weight', onDone: () => text.isEmpty ? null : (double.tryParse(text) ?? 0, birds.toInt()), builder: (ctx, set) => Column(children: [
        QuickChips(items: [if (yesterday != null) ('Last: ${Fmt.number(yesterday)} g', yesterday)], onPick: (v) => set(() => text = _str(v))),
        NumberPad(text: text, unit: 'g', decimal: false, onChanged: (t) => set(() => text = t)),
        BigStepper(label: 'Birds weighed', value: birds, step: 5, min: 1, max: 500, format: (v) => '${v.toInt()}', onChanged: (v) => set(() => birds = v)),
      ]));
}

/// Temperature low and high, ±0.5 °C steps from the last values (or typical house values).
Future<(double?, double?)?> showTemperatureSheet(BuildContext context, {double? min, double? max}) {
  num lo = min ?? 24;
  num hi = max ?? 30;
  return showEntrySheet(context, title: 'House temperature', onDone: () => (lo.toDouble(), hi.toDouble()), builder: (ctx, set) => Column(children: [
        BigStepper(label: 'Lowest', value: lo, step: 0.5, min: -20, max: 60, format: (v) => '${Fmt.number(v, digits: 1)}°', onChanged: (v) => set(() => lo = v)),
        BigStepper(label: 'Highest', value: hi, step: 0.5, min: -20, max: 60, format: (v) => '${Fmt.number(v, digits: 1)}°', onChanged: (v) => set(() => hi = v)),
        if (lo > hi) const Text('Lowest is above highest', style: TextStyle(color: AppColors.roseInk)),
      ]));
}

/// Humidity: a big slider with ±5 buttons.
Future<double?> showHumiditySheet(BuildContext context, {double? value}) {
  var v = value ?? 60.0;
  return showEntrySheet(context, title: 'Humidity', onDone: () => v, builder: (ctx, set) => Column(children: [
        Text('${v.round()}%', style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w700)),
        Slider(value: v, min: 0, max: 100, divisions: 100, label: '${v.round()}%', onChanged: (x) => set(() => v = x)),
        BigStepper(label: 'Adjust', value: v.round(), step: 5, max: 100, format: (x) => '${x.toInt()}%', onChanged: (x) => set(() => v = x.toDouble())),
      ]));
}

/// A health observation: tap the signs seen, set how many birds; a short note is optional.
Future<Observation?> showHealthSheet(BuildContext context) {
  final picked = <String>{};
  num affected = 1;
  final note = TextEditingController();
  return showEntrySheet(context, title: 'What did you see?', done: 'Add', onDone: () {
    final signs = [...picked, if (note.text.trim().isNotEmpty) note.text.trim()].join(', ');
    return signs.isEmpty ? null : Observation(signs: signs, affectedBirds: affected.toInt());
  }, builder: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final s in commonSigns)
            FilterChip(
              label: Text(s, style: const TextStyle(fontSize: 15)),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              selected: picked.contains(s),
              onSelected: (on) => set(() {
                _tick();
                on ? picked.add(s) : picked.remove(s);
              }),
            ),
        ]),
        const SizedBox(height: 8),
        BigStepper(label: 'Birds affected', value: affected, min: 1, format: (v) => '${v.toInt()}', onChanged: (v) => set(() => affected = v)),
        TextField(controller: note, decoration: const InputDecoration(labelText: 'Anything else (optional)'), textCapitalization: TextCapitalization.sentences),
      ]));
}
