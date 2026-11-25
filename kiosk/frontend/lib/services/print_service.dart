import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/kiosk_config.dart';

/// Talks to the on-box **kiosk-bridge** to drive the local ESC/POS printer.
/// The browser can't reach the printer directly, so printing always goes
/// through the bridge (loopback). Both rails print the entry ticket here; for
/// Rail A the e-barimt receipt also prints here (QPay already issued it).
class PrintService {
  PrintService._();

  /// POST {bridge}/print/ticket — print the stadium entry ticket (with its
  /// validation QR from the cloud). Idempotent on [orderRef] in the bridge.
  static Future<void> printTicket({
    required String orderRef,
    required String event,
    required String zone,
    required int quantity,
    required String startsAt, // ISO-8601
    required String venue,
    required String qrData, // entry-validation QR from tickets.ts
  }) async {
    await _post('print/ticket', {
      'orderRef': orderRef,
      'event': event,
      'zone': zone,
      'quantity': quantity,
      'startsAt': startsAt,
      'venue': venue,
      'qrData': qrData,
    });
  }

  /// POST {bridge}/print/receipt — print the e-barimt fiscal receipt
  /// (QPay-issued). Idempotent on [orderRef] in the bridge.
  static Future<void> printReceipt({
    required String orderRef,
    required List<Map<String, Object>> lines, // {name, qty, unitPrice}
    required int total,
    required String ebarimtQrData,
    required String ebarimtLottery,
  }) async {
    await _post('print/receipt', {
      'orderRef': orderRef,
      'lines': lines,
      'total': total,
      'ebarimtQrData': ebarimtQrData,
      'ebarimtLottery': ebarimtLottery,
    });
  }

  static Future<void> _post(String path, Map<String, Object?> body) async {
    final res = await http
        .post(KioskConfig.bridge(path),
            headers: const {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(KioskConfig.paymentTimeout);
    if (res.statusCode != 200) {
      throw PrintException('$path failed: HTTP ${res.statusCode} ${res.body}');
    }
  }
}

class PrintException implements Exception {
  final String message;
  const PrintException(this.message);
  @override
  String toString() => 'PrintException: $message';
}
