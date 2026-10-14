import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The PoultryPilot palette, the same as the web app (oklch values converted to sRGB). Fills use the light hues;
/// text uses the darker "ink" shades of the same hues for contrast.
class AppColors {
  const AppColors._();

  static const ink = Color(0xFF1B1D3A);
  static const inkSoft = Color(0xFF5B5F86);
  static const brand = Color(0xFF6B7FF0);
  static const brandInk = Color(0xFF3F52C8);
  static const mint = Color(0xFF3FD3A0);
  static const mintInk = Color(0xFF1C8063);
  static const amber = Color(0xFFF2A93B);
  static const amberInk = Color(0xFF9A5B0E);
  static const rose = Color(0xFFF2667A);
  static const roseInk = Color(0xFFB4283F);
  static const cyan = Color(0xFF4FD4E6);
  static const cyanInk = Color(0xFF237683);
  static const accent = Color(0xFF7C3AED);
  static const background = Color(0xFFEDEFF8);
  static const card = Color(0xFFFCFCFF);
  static const line = Color(0xFFDDE0EE);

  /// The rainbow edge of the "prism glass" cards.
  static const prism = [Color(0x8CFB7185), Color(0x73F59E0B), Color(0x8034D399), Color(0x8022D3EE), Color(0x807C3AED)];
}

class AppTheme {
  const AppTheme._();

  static const radius = 14.0;

  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: AppColors.brand, brightness: Brightness.light, surface: AppColors.card, primary: AppColors.ink, secondary: AppColors.brand, error: AppColors.roseInk),
      scaffoldBackgroundColor: AppColors.background,
    );
    final body = GoogleFonts.interTextTheme(base.textTheme).apply(bodyColor: AppColors.ink, displayColor: AppColors.ink);
    TextStyle? display(TextStyle? s) => s == null ? null : GoogleFonts.spaceGrotesk(textStyle: s, fontWeight: FontWeight.w600, letterSpacing: -0.2);
    return base.copyWith(
      textTheme: body.copyWith(
        displaySmall: display(body.displaySmall),
        headlineMedium: display(body.headlineMedium),
        headlineSmall: display(body.headlineSmall),
        titleLarge: display(body.titleLarge),
        titleMedium: display(body.titleMedium),
      ),
      appBarTheme: const AppBarTheme(backgroundColor: Colors.transparent, foregroundColor: AppColors.ink, elevation: 0, scrolledUnderElevation: 0, centerTitle: false),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.6),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.8))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: const BorderSide(color: AppColors.brand, width: 1.5)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(radius), borderSide: const BorderSide(color: AppColors.rose)),
        labelStyle: const TextStyle(color: AppColors.inkSoft),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(backgroundColor: AppColors.ink, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)), textStyle: const TextStyle(fontWeight: FontWeight.w600)),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(foregroundColor: AppColors.ink, minimumSize: const Size.fromHeight(50), side: const BorderSide(color: AppColors.line), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius))),
      ),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: Colors.white.withValues(alpha: 0.85), indicatorColor: AppColors.brand.withValues(alpha: 0.15), surfaceTintColor: Colors.transparent),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
