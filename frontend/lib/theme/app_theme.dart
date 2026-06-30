import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Light, minimal Material 3 theme — an editorial "paper" surface for the kiosk.
class AppTheme {
  AppTheme._();

  static const String _sans = 'Manrope'; // body / UI (display lives in KioskText)

  static ThemeData get light {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: _sans,
      scaffoldBackgroundColor: AppColors.bg0,
      colorScheme: const ColorScheme.light(
        primary: AppColors.magenta,
        onPrimary: AppColors.onAccent,
        secondary: AppColors.violet,
        surface: AppColors.bg1,
        error: AppColors.danger,
        onSurface: AppColors.text,
      ),
    );

    return base.copyWith(
      textTheme: base.textTheme.apply(
        bodyColor: AppColors.text,
        displayColor: AppColors.text,
        fontFamily: _sans,
      ),
      dividerTheme: const DividerThemeData(color: AppColors.stroke, thickness: 1, space: 1),
      splashFactory: NoSplash.splashFactory,
      highlightColor: Colors.transparent,
    );
  }

  static ThemeData get dark => light; // alias kept for call sites
}

/// Type scale: the bold **YU Buyan** display face for headlines, paired with the
/// clean **Manrope** sans for titles, body, labels and numerals. Both carry full
/// Cyrillic + Mongolian for the MN/EN copy.
class KioskText {
  KioskText._();

  static const String _display = 'YU Buyan Bold';
  static const String _sans = 'Manrope';

  // Display — bold, characterful headline face.
  static const TextStyle displayXL = TextStyle(
    fontFamily: _display,
    fontSize: 62,
    height: 1.02,
    letterSpacing: -0.5,
    color: AppColors.text,
  );

  static const TextStyle display = TextStyle(
    fontFamily: _display,
    fontSize: 44,
    height: 1.05,
    letterSpacing: -0.3,
    color: AppColors.text,
  );

  static const TextStyle h1 = TextStyle(
    fontFamily: _display,
    fontSize: 33,
    height: 1.14,
    color: AppColors.text,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: _display,
    fontSize: 25,
    color: AppColors.text,
  );

  // Title — sans, for UI clarity at touch sizes.
  static const TextStyle title = TextStyle(
    fontFamily: _sans,
    fontSize: 21,
    fontWeight: FontWeight.w600,
    color: AppColors.text,
  );

  static const TextStyle body = TextStyle(
    fontFamily: _sans,
    fontSize: 19,
    height: 1.5,
    fontWeight: FontWeight.w400,
    color: AppColors.textSoft,
  );

  /// Small uppercase tracked label.
  static const TextStyle label = TextStyle(
    fontFamily: _sans,
    fontSize: 13,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.8,
    color: AppColors.textMuted,
  );

  static const TextStyle price = TextStyle(
    fontFamily: _sans,
    fontSize: 27,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.5,
    color: AppColors.text,
  );
}
