import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import 'parse.dart';

/// A priced capacity zone for an event (e.g. "VIP table", "Premium standing").
///
/// Per the brief, zones are **capacity counters only** — no row/seat selection.
/// `available` is what the UI shows; the real source of truth is the
/// server-side atomic counter (this is just for the prototype).
class Zone {
  final String id;
  final String nameMn;
  final String nameEn;
  final String descMn;
  final String descEn;
  final int price; // MNT
  final int capacity;
  final int sold;
  final Color color;

  const Zone({
    required this.id,
    required this.nameMn,
    required this.nameEn,
    required this.descMn,
    required this.descEn,
    required this.price,
    required this.capacity,
    required this.sold,
    required this.color,
  });

  /// Build a Zone from the cs360 `GET /api/kiosk/events` payload (a `KioskZone`:
  /// flat snake_case with `name_mn/name_en/desc_mn/desc_en`, price, capacity,
  /// sold, color hex). Tolerant of missing fields.
  factory Zone.fromJson(Map<String, dynamic> j) {
    String s(String key, [String fallback = '']) => (j[key] as String?) ?? fallback;
    return Zone(
      id: s('id'),
      nameMn: s('name_mn'),
      nameEn: (j['name_en'] as String?) ?? s('name_mn'),
      descMn: s('desc_mn'),
      descEn: (j['desc_en'] as String?) ?? s('desc_mn'),
      price: (j['price'] as num?)?.toInt() ?? 0,
      capacity: (j['capacity'] as num?)?.toInt() ?? 0,
      sold: (j['sold'] as num?)?.toInt() ?? 0,
      color: hexColor(j['color'] as String?) ?? const Color(0xFF2F6E8F),
    );
  }

  String name(Lang lang) => lang == Lang.mn ? nameMn : nameEn;
  String desc(Lang lang) => lang == Lang.mn ? descMn : descEn;

  int get available => capacity - sold;
  bool get soldOut => available <= 0;

  /// Fraction of capacity remaining, 0..1.
  double get availabilityFraction =>
      capacity == 0 ? 0 : (available / capacity).clamp(0, 1).toDouble();
}
