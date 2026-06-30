import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import 'parse.dart';
import 'zone.dart';

/// An event in the catalog. In production this is read from Firebase;
/// here it is mock data. Title is a proper name (not translated); the
/// subtitle and description are bilingual.
class Event {
  final String id;
  final String title;
  final String subtitleMn;
  final String subtitleEn;
  final DateTime startsAt;
  final String venue;
  final String descriptionMn;
  final String descriptionEn;
  final String image; // banner asset path (1920×648 artwork)
  final IconData icon; // fallback line icon if the image fails to load
  final Color tint; // faint hue used for fallback / scrims
  final List<Zone> zones;

  const Event({
    required this.id,
    required this.title,
    required this.subtitleMn,
    required this.subtitleEn,
    required this.startsAt,
    required this.venue,
    required this.descriptionMn,
    required this.descriptionEn,
    required this.image,
    required this.icon,
    required this.tint,
    required this.zones,
  });

  /// Build an Event from the cs360 `GET /api/kiosk/events` payload (a
  /// `KioskEvent`: single-language `title`/`description`, `start_time`, `image`,
  /// `thumbnail_url`, and in-person `zones`). The backend has no per-event
  /// subtitle/venue/icon/tint, so those are left blank or derived (venue is the
  /// stadium; tint follows the first zone's colour). Tolerant of missing fields.
  factory Event.fromJson(Map<String, dynamic> j) {
    String s(String key, [String fallback = '']) => (j[key] as String?) ?? fallback;
    final zones = [
      for (final z in (j['zones'] as List?) ?? const [])
        if (z is Map<String, dynamic>) Zone.fromJson(z),
    ];
    final desc = j['description'] as String?;
    final image = (j['image'] as String?) ?? (j['thumbnail_url'] as String?) ?? '';
    return Event(
      id: s('id'),
      title: s('title'),
      subtitleMn: '',
      subtitleEn: '',
      startsAt: DateTime.tryParse(s('start_time'))?.toLocal() ?? DateTime(2000),
      venue: 'Цэнгэлдэх хүрээлэн · National Stadium',
      descriptionMn: desc ?? '',
      descriptionEn: desc ?? '',
      image: image,
      icon: iconForKey(null),
      tint: zones.isNotEmpty ? zones.first.color : const Color(0xFF2F6E8F),
      zones: zones,
    );
  }

  /// Builds the cover-image ("Нүүр зураг") widget for [image].
  ///
  /// Live covers come from arbitrary CDNs (e.g. `content.ikon.mn`) that don't
  /// send CORS headers. On Flutter **web** the default CanvasKit renderer must
  /// draw network images onto a canvas, which the browser blocks for such
  /// cross-origin images — so they silently fail to the [errorBuilder]. Using
  /// [WebHtmlElementStrategy.fallback] makes Flutter render those via a real
  /// HTML `<img>` element (no CORS-taint limit) when canvas drawing isn't
  /// possible. Bundled assets keep the plain [AssetImage] path.
  Widget buildCover({
    required BoxFit fit,
    AlignmentGeometry alignment = Alignment.center,
    required ImageErrorWidgetBuilder errorBuilder,
  }) {
    if (image.startsWith('http')) {
      return Image.network(
        image,
        fit: fit,
        alignment: alignment,
        errorBuilder: errorBuilder,
        webHtmlElementStrategy: WebHtmlElementStrategy.fallback,
      );
    }
    return Image(
      image: AssetImage(image),
      fit: fit,
      alignment: alignment,
      errorBuilder: errorBuilder,
    );
  }

  String subtitle(Lang lang) => lang == Lang.mn ? subtitleMn : subtitleEn;
  String description(Lang lang) => lang == Lang.mn ? descriptionMn : descriptionEn;

  int get lowestPrice =>
      zones.map((z) => z.price).fold<int>(1 << 30, (a, b) => a < b ? a : b);

  bool get anyAvailable => zones.any((z) => !z.soldOut);
}
