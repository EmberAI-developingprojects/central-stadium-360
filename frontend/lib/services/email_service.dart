import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/kiosk_config.dart';
import '../models/payment.dart';

/// Sends the customer's digital ticket(s) + И-Баримт to their email, via the
/// on-box **kiosk-bridge** (the browser can't hold mail credentials). The
/// bridge renders the QR images and sends through Resend.
class EmailService {
  EmailService._();

  /// POST {bridge}/email/ticket. Idempotent on orderRef+to in the bridge.
  /// Throws [EmailException] on failure so the UI can offer a retry.
  static Future<void> sendTicket({
    required String to,
    required String orderRef,
    required String event,
    required DateTime startsAt,
    required String venue,
    required int total,
    required List<KioskTicket> tickets,
    EbarimtReceipt? ebarimt,
    String lang = 'mn',
  }) async {
    final res = await http
        .post(
          KioskConfig.bridge('email/ticket'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({
            'to': to,
            'lang': lang,
            'orderRef': orderRef,
            'event': event,
            'startsAt': startsAt.toIso8601String(),
            'venue': venue,
            'total': total,
            'tickets': [
              for (final t in tickets) {'code': t.code, 'zone': t.zoneNameEn},
            ],
            if (ebarimt != null && ebarimt.qrData.isNotEmpty)
              'ebarimt': {'qrData': ebarimt.qrData, 'lottery': ebarimt.lottery},
          }),
        )
        .timeout(KioskConfig.paymentTimeout);
    if (res.statusCode != 200) {
      throw EmailException('email/ticket failed: HTTP ${res.statusCode} ${res.body}');
    }
  }

  /// Lightweight client-side check before we bother the bridge. The bridge
  /// validates again server-side (zod `.email()`).
  static bool looksValid(String email) {
    final e = email.trim();
    return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(e);
  }
}

class EmailException implements Exception {
  final String message;
  const EmailException(this.message);
  @override
  String toString() => 'EmailException: $message';
}
