import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/kiosk_config.dart';
import '../models/payment.dart';

/// Card-rail calls to the on-box kiosk-bridge: charge the terminal and issue
/// the e-barimt via the local POSAPI. (Printing lives in PrintService; the
/// QPay rail is cloud-side in PaymentService.)
class BridgeService {
  BridgeService._();

  /// POST {bridge}/pos/charge → true if the card was approved.
  static Future<bool> posCharge({
    required String orderRef,
    required int amount,
  }) async {
    final j = await _post('pos/charge', {'orderRef': orderRef, 'amount': amount});
    return j['approved'] == true;
  }

  /// POST {bridge}/ebarimt/receipt → fiscal receipt from the local POSAPI.
  static Future<EbarimtReceipt> issueEbarimt({
    required String orderRef,
    required List<Map<String, Object>> items,
  }) async {
    final j = await _post('ebarimt/receipt', {'orderRef': orderRef, 'items': items});
    return EbarimtReceipt(
      qrData: (j['qrData'] ?? j['ebarimt_qr_data'] ?? '') as String,
      lottery: (j['lottery'] ?? j['ebarimt_lottery'] ?? '') as String,
    );
  }

  static Future<Map<String, dynamic>> _post(
    String path,
    Map<String, Object?> body,
  ) async {
    final res = await http
        .post(KioskConfig.bridge(path),
            headers: const {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(KioskConfig.paymentTimeout);
    if (res.statusCode != 200) {
      throw BridgeException('$path failed: HTTP ${res.statusCode}');
    }
    return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
  }
}

class BridgeException implements Exception {
  final String message;
  const BridgeException(this.message);
  @override
  String toString() => 'BridgeException: $message';
}
