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
    final j = await _post(
      'pos/charge',
      {'orderRef': orderRef, 'amount': amount},
      timeout: KioskConfig.cardTimeout,
    );
    return j['approved'] == true;
  }

  /// GET {bridge}/ebarimt/org?regno= — who is this register number?
  ///
  /// The bridge asks ТЕГ's public directory (register number → ТТД → name), so
  /// a B2B buyer types the number they know by heart and confirms the name
  /// before the receipt is written. Returns null when nothing is found or the
  /// directory is unreachable — the buyer is then told, not silently charged
  /// to the wrong company.
  static Future<OrgLookup?> lookupOrg(String regno) async {
    try {
      final uri = KioskConfig
          .bridge('ebarimt/org')
          .replace(queryParameters: {'regno': regno});
      final res = await http
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 12));
      if (res.statusCode != 200) return null;
      final j = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
      if (j['found'] != true) return null;
      final tin = (j['tin'] ?? '') as String;
      if (tin.isEmpty) return null;
      return OrgLookup(regno: regno, tin: tin, name: (j['name'] ?? '') as String);
    } catch (_) {
      return null;
    }
  }

  /// POST {bridge}/ebarimt/receipt → fiscal receipt from the local POSAPI.
  ///
  /// [customerTin] set → the barimt is written to that company (B2B_RECEIPT)
  /// and the printed slip carries a Худ.авагч ТТД row.
  static Future<EbarimtReceipt> issueEbarimt({
    required String orderRef,
    required List<Map<String, Object>> items,
    String? customerTin,
  }) async {
    final j = await _post('ebarimt/receipt', {
      'orderRef': orderRef,
      'items': items,
      if (customerTin != null && customerTin.isNotEmpty) ...{
        'customerTin': customerTin,
        'type': 'B2B_RECEIPT',
      },
    });
    return EbarimtReceipt(
      qrData: (j['qrData'] ?? j['ebarimt_qr_data'] ?? '') as String,
      lottery: (j['lottery'] ?? j['ebarimt_lottery'] ?? '') as String,
    );
  }

  static Future<Map<String, dynamic>> _post(
    String path,
    Map<String, Object?> body, {
    Duration? timeout,
  }) async {
    final res = await http
        .post(KioskConfig.bridge(path),
            headers: const {'Content-Type': 'application/json'}, body: jsonEncode(body))
        .timeout(timeout ?? KioskConfig.paymentTimeout);
    if (res.statusCode != 200) {
      throw BridgeException('$path failed: HTTP ${res.statusCode}');
    }
    return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
  }
}

/// An organisation resolved from its register number via ТЕГ's directory.
class OrgLookup {
  final String regno;
  final String tin;
  final String name;
  const OrgLookup({required this.regno, required this.tin, required this.name});
}

class BridgeException implements Exception {
  final String message;
  const BridgeException(this.message);
  @override
  String toString() => 'BridgeException: $message';
}
