import 'package:flutter/material.dart';

/// "Paper" palette — a light, minimal, editorial scheme: warm paper, near-black
/// ink, hairline dividers and flat white cards, with the venue's **brand royal
/// blue** accent (sampled from the logo: dome #0028C8, wordmark navy #081840).
class AppColors {
  AppColors._();

  // --- Base / paper -----------------------------------------------------
  static const Color bg0 = Color(0xFFE7E2D7); // warm greige (page) — calmer, less bright
  static const Color bg1 = Color(0xFFFFFFFF); // white card / raised
  static const Color bg2 = Color(0xFFF3F0E9); // subtle raised surface

  // --- Surfaces (light fills + hairlines) -------------------------------
  static const Color glass = Color(0xFFFFFFFF); // card fill
  static const Color glassHi = Color(0xFFF0EDE6); // hover / active fill
  static const Color stroke = Color(0xFFE6E1D6); // hairline
  static const Color strokeHi = Color(0xFFD3CDBE); // stronger hairline
  static const Color goldLine = Color(0x4D0028C8); // brand-blue hairline (~30%)

  // --- Text (near-black ink on paper) -----------------------------------
  static const Color text = Color(0xFF1C1A22); // primary ink
  static const Color textSoft = Color(0xFF5A5664); // secondary
  static const Color textMuted = Color(0xFF938E9C); // tertiary / labels

  // --- Accents ----------------------------------------------------------
  // The historical token *names* are kept (widgets reference them widely) but
  // repointed to the brand hues — royal blue is the single hero accent.
  static const Color magenta = Color(0xFF0028C8); // PRIMARY brand royal blue
  static const Color violet = Color(0xFF0B1E52); // deep brand navy (gradient end)
  static const Color indigo = Color(0xFF081840); // navy depth
  static const Color cyan = Color(0xFF2E8B7E); // muted teal (availability accent)
  static const Color gold = Color(0xFF3F5BE6); // lighter brand blue (highlights/rings)

  /// Text/icon color to sit ON the royal-blue accent.
  static const Color onAccent = Color(0xFFFFFFFF);

  // --- Semantic ---------------------------------------------------------
  static const Color success = Color(0xFF2E9E6B);
  static const Color danger = Color(0xFFD5483F);

  // --- Signature gradients ---------------------------------------------
  /// Primary brand gradient — royal blue. Used on CTAs & highlights.
  static const Gradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1E3CE0), magenta],
  );

  /// Alternate — blue → navy. Used for secondary marks & frames.
  static const Gradient brandCool = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [magenta, violet],
  );

  /// Subtle top-sheen gradient for cards.
  static const Gradient sheen = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0x06000000), Color(0x00000000)],
  );

  // --- Backwards-compatible aliases (old token names still used widely) -
  static const Color paper = bg0;
  static const Color paperWarm = bg1;
  static const Color card = glass;
  static const Color ink = text;
  static const Color inkSoft = textSoft;
  static const Color muted = textMuted;
  static const Color line = stroke;
  static const Color accent = magenta;
  static const Color accentTint = Color(0x240028C8); // selected fill (~14% royal blue)
  static const Color primary = magenta;
  static const Color accentWarm = violet;
}
