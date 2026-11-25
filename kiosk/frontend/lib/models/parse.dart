import 'package:flutter/material.dart';

/// Parse a `#RRGGBB` / `#AARRGGBB` (or without `#`) hex string into a [Color].
/// Returns null on null/empty/garbage so callers can apply a default.
Color? hexColor(String? hex) {
  if (hex == null) return null;
  var h = hex.trim().replaceFirst('#', '');
  if (h.isEmpty) return null;
  if (h.length == 6) h = 'FF$h'; // assume opaque
  final v = int.tryParse(h, radix: 16);
  return v == null ? null : Color(v);
}

/// Map a backend category/icon key to a Material icon for the fallback art
/// (shown only if the banner image fails to load). Unknown → a generic event.
IconData iconForKey(String? key) {
  switch (key) {
    case 'concert':
    case 'music':
      return Icons.music_note_rounded;
    case 'hiphop':
    case 'mic':
      return Icons.mic_external_on_rounded;
    case 'sport':
    case 'sports':
      return Icons.sports_soccer_rounded;
    case 'show':
    case 'live':
      return Icons.theater_comedy_rounded;
    case 'cold':
    case 'winter':
      return Icons.ac_unit_rounded;
    case 'bolt':
    case 'edm':
      return Icons.bolt_rounded;
    default:
      return Icons.event_rounded;
  }
}
