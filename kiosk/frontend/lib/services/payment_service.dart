import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/kiosk_config.dart';
import '../models/payment.dart';
import '../models/ticket_order.dart';

/// One line of an in-person order: a zone and how many admissions.
typedef OrderLine = ({String zoneId, int qty});

/// Talks to the cs360 backend's in-person endpoints (`/api/kiosk/*`). The buyer
/// is anonymous; the device authenticates with the kiosk key. QPay payment +
/// e-barimt happen cloud-side; the card rail reports its result back here.
///
/// Nothing here touches the box hardware — see PrintService for the printer and
/// the bridge for the card terminal.
class PaymentService {
  PaymentService._();

  /// POST /api/kiosk/orders → reserves capacity and (QPay rail) returns the QR.
  static Future<KioskOrder> createOrder({
    required String eventId,
    required List<OrderLine> items,
    required PaymentMethod method,
    String? buyerPhone,
  }) async {
    final data = await _post('orders', {
      'event_id': eventId,
      'items': [
        for (final i in items) {'zone_id': i.zoneId, 'qty': i.qty},
      ],
      'method': method.name, // 'qpay' | 'card'
      if (buyerPhone != null && buyerPhone.isNotEmpty) 'buyer_phone': buyerPhone,
    });
    return KioskOrder.fromJson(data);
  }

  /// GET /api/kiosk/orders/:id/status → settles on the backend the first time
  /// QPay reports paid; returns tickets + e-barimt once paid.
  static Future<KioskOrderStatus> status(String orderId) async {
    final data = await _get('orders/$orderId/status');
    return KioskOrderStatus.fromJson(data);
  }

  /// Card rail: report the terminal charge + POSAPI e-barimt back to the backend
  /// so it settles the order, mints tickets and stores the receipt.
  static Future<KioskOrderStatus> cardResult(
    String orderId, {
    required bool approved,
    EbarimtReceipt? ebarimt,
    String? paymentRef,
  }) async {
    final data = await _post('orders/$orderId/card-result', {
      'approved': approved,
      if (paymentRef != null) 'payment_ref': paymentRef,
      if (ebarimt != null) 'ebarimt': ebarimt.toJson(),
    });
    return KioskOrderStatus.fromJson(data);
  }

  /// Polls [status] until paid/failed or [timeout] elapses (pending on timeout).
  static Future<KioskOrderStatus> pollUntilSettled(
    String orderId, {
    Duration interval = const Duration(seconds: 3),
    Duration timeout = const Duration(minutes: 5),
  }) async {
    final deadline = DateTime.now().add(timeout);
    KioskOrderStatus? last;
    while (DateTime.now().isBefore(deadline)) {
      try {
        last = await status(orderId);
        if (last.status != PaymentStatus.pending) return last;
      } catch (_) {
        // transient — keep polling while the user waits
      }
      await Future<void>.delayed(interval);
    }
    return last ??
        KioskOrderStatus(
          orderId: orderId,
          reference: orderId,
          status: PaymentStatus.pending,
          total: 0,
        );
  }

  // --- helpers (unwrap the {ok, data} envelope) ------------------------------

  static Future<Map<String, dynamic>> _post(
    String path,
    Map<String, Object?> body,
  ) async {
    final res = await http
        .post(
          KioskConfig.kioskApi(path),
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...KioskConfig.kioskHeaders,
          },
          body: jsonEncode(body),
        )
        .timeout(KioskConfig.paymentTimeout);
    return _unwrap(path, res);
  }

  static Future<Map<String, dynamic>> _get(String path) async {
    final res = await http
        .get(
          KioskConfig.kioskApi(path),
          headers: {'Accept': 'application/json', ...KioskConfig.kioskHeaders},
        )
        .timeout(KioskConfig.paymentTimeout);
    return _unwrap(path, res);
  }

  static Map<String, dynamic> _unwrap(String path, http.Response res) {
    if (res.statusCode != 200) {
      throw PaymentException('$path failed: HTTP ${res.statusCode} ${res.body}');
    }
    final body = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    if (body['ok'] == false) {
      throw PaymentException('$path error: ${body['error']}');
    }
    return (body['data'] as Map<String, dynamic>?) ?? const {};
  }
}

class PaymentException implements Exception {
  final String message;
  const PaymentException(this.message);
  @override
  String toString() => 'PaymentException: $message';
}
