import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Reusable surface decorations for the Paper theme: flat white cards with a
/// hairline border and a soft, neutral shadow. Selected cards pick up a faint
/// terracotta tint + accent border. Clean and structured — no colored glows.
class AppDeco {
  AppDeco._();

  /// A clean card surface. [glow] is accepted for call-site compatibility but
  /// intentionally ignored in the minimal theme. [selected] tints it terracotta.
  static BoxDecoration glass({
    double radius = 24,
    Color? glow,
    double glowOpacity = 0.28,
    bool selected = false,
  }) {
    return BoxDecoration(
      color: selected ? AppColors.accentTint : AppColors.glass,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: selected ? AppColors.magenta.withValues(alpha: 0.7) : AppColors.stroke,
        width: selected ? 1.6 : 1,
      ),
      boxShadow: [
        // Soft, low, neutral lift off the paper.
        BoxShadow(
          color: const Color(0xFF2A2520).withValues(alpha: selected ? 0.10 : 0.06),
          blurRadius: 24,
          spreadRadius: -8,
          offset: const Offset(0, 12),
        ),
      ],
    );
  }

  /// Soft neutral drop shadow for poster / hero artwork. ([tint] ignored —
  /// kept for call-site compatibility.)
  static List<BoxShadow> artGlow(Color tint) => const [
        BoxShadow(color: Color(0x1A2A2520), blurRadius: 28, spreadRadius: -10, offset: Offset(0, 16)),
      ];
}
