import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/kiosk_config.dart';
import '../models/event.dart';

/// Reads the live in-person catalog from the cs360 backend
/// (`GET /api/kiosk/events`) — the same events the website serves, plus their
/// in-person zones, so an admin price/capacity change shows up on the kiosk.
///
/// The kiosk must never hard-fail on a network blip, so this throws on failure
/// and the caller ([EventsScope]) falls back to the last good / bundled catalog.
class EventsService {
  EventsService._();

  /// GET {base}/api/kiosk/events -> List<Event>. Response is `{ ok, data: [...] }`.
  /// Throws [EventsException] on any failure.
  static Future<List<Event>> fetchAll() async {
    if (!KioskConfig.isLive) {
      throw const EventsException('No backend configured (KIOSK_API_BASE empty)');
    }
    final uri = KioskConfig.kioskApi('events');
    try {
      final res = await http
          .get(uri, headers: {'Accept': 'application/json', ...KioskConfig.kioskHeaders})
          .timeout(KioskConfig.fetchTimeout);
      if (res.statusCode != 200) {
        throw EventsException('HTTP ${res.statusCode} from $uri');
      }
      final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      if (body['ok'] == false) {
        throw EventsException('backend error: ${body['error']}');
      }
      final list = (body['data'] as List?) ?? const [];
      final events = [
        for (final e in list)
          if (e is Map<String, dynamic>) Event.fromJson(e),
      ];
      if (events.isEmpty) throw const EventsException('Empty catalog');
      return events;
    } on EventsException {
      rethrow;
    } catch (e) {
      throw EventsException('$e');
    }
  }
}

/// Signals a catalog fetch failure so the caller can fall back gracefully.
class EventsException implements Exception {
  final String message;
  const EventsException(this.message);
  @override
  String toString() => 'EventsException: $message';
}
