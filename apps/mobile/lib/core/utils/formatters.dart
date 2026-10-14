import 'package:intl/intl.dart';

/// Display formatting. Money arrives from the API in minor units with its currency (never assumed to be USD).
class Fmt {
  const Fmt._();

  static int _digits(String currency) {
    final d = NumberFormat.simpleCurrency(name: currency).decimalDigits;
    return d ?? 2;
  }

  static String money(num? minor, String currency, {bool compact = false}) {
    if (minor == null) return '—';
    final digits = _digits(currency);
    final major = minor / _pow10(digits);
    final f = compact ? NumberFormat.compactSimpleCurrency(name: currency) : NumberFormat.simpleCurrency(name: currency, decimalDigits: digits);
    return f.format(major);
  }

  static String number(num? n, {int digits = 0}) {
    if (n == null) return '—';
    return NumberFormat.decimalPatternDigits(decimalDigits: digits).format(n);
  }

  static String percent(num? n, {int digits = 1}) => n == null ? '—' : '${number(n, digits: digits)}%';

  /// "14 Oct" from an ISO date ("2026-10-14" or a full timestamp).
  static String shortDate(String? iso) {
    if (iso == null || iso.length < 10) return '—';
    final d = DateTime.tryParse(iso.substring(0, 10));
    return d == null ? '—' : DateFormat('d MMM').format(d);
  }

  static String dateTime(String? iso) {
    final d = iso == null ? null : DateTime.tryParse(iso)?.toLocal();
    return d == null ? '—' : DateFormat('d MMM, HH:mm').format(d);
  }

  /// "Heat stress" from "heat_stress".
  static String label(String? s) {
    if (s == null || s.isEmpty) return '—';
    final t = s.replaceAll('_', ' ');
    return t[0].toUpperCase() + t.substring(1);
  }

  static num _pow10(int n) {
    var r = 1;
    for (var i = 0; i < n; i++) {
      r *= 10;
    }
    return r;
  }
}
