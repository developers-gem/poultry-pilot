import 'package:flutter_test/flutter_test.dart';
import 'package:poultrypilot_mobile/core/utils/formatters.dart';

void main() {
  test('money from minor units in the farm currency', () {
    expect(Fmt.money(123450, 'INR'), contains('1,234.50'));
    expect(Fmt.money(-280000, 'INR'), contains('2,800.00'));
    expect(Fmt.money(null, 'INR'), '—');
  });

  test('numbers, percentages, labels and dates', () {
    expect(Fmt.number(1234567), '1,234,567');
    expect(Fmt.percent(90.27), '90.3%');
    expect(Fmt.label('heat_stress'), 'Heat stress');
    expect(Fmt.shortDate('2026-10-14'), '14 Oct');
    expect(Fmt.shortDate(null), '—');
  });
}
