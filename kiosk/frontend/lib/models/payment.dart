import 'dart:convert';
import 'dart:typed_data';

import '../l10n/app_lang.dart';

enum PaymentStatus { pending, paid, failed }

PaymentStatus _statusFrom(String? raw) {
  switch ((raw ?? 'pending').toLowerCase()) {
    case 'paid':
      return PaymentStatus.paid;
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return PaymentStatus.failed;
    default:
      return PaymentStatus.pending;
  }
}

/// Result of creating an in-person order on the cs360 backend
/// (`POST /api/kiosk/orders`). For the QPay rail it carries the QR to display;
/// for the card rail there's no QR (the bridge charges the terminal).
class KioskOrder {
  final String orderId;
  final String reference;
  final int total; // MNT
  final String qrText;
  final String qrImageBase64; // base64 PNG from QPay (no QR library needed)
  final List<BankDeeplink> deeplinks;

  const KioskOrder({
    required this.orderId,
    required this.reference,
    required this.total,
    required this.qrText,
    required this.qrImageBase64,
    required this.deeplinks,
  });

  bool get hasQr => qrImageBase64.isNotEmpty;

  /// Decoded PNG bytes for `Image.memory(...)`. Tolerant of a `data:` prefix.
  Uint8List get qrImageBytes {
    final b64 =
        qrImageBase64.contains(',') ? qrImageBase64.split(',').last : qrImageBase64;
    return base64Decode(b64);
  }

  factory KioskOrder.fromJson(Map<String, dynamic> j) => KioskOrder(
        orderId: (j['order_id'] ?? '') as String,
        reference: (j['reference'] ?? '') as String,
        total: (j['total'] as num?)?.toInt() ?? 0,
        qrText: (j['qr_text'] ?? '') as String,
        qrImageBase64: (j['qr_image'] ?? '') as String,
        deeplinks: [
          for (final d in (j['urls'] ?? const []) as List)
            if (d is Map<String, dynamic>) BankDeeplink.fromJson(d),
        ],
      );
}

/// A bank-app deep link (informational on a public kiosk — users scan with
/// their own phone).
class BankDeeplink {
  final String name;
  final String description;
  final String logo;
  final String link;
  const BankDeeplink({
    required this.name,
    required this.description,
    required this.logo,
    required this.link,
  });
  factory BankDeeplink.fromJson(Map<String, dynamic> j) => BankDeeplink(
        name: (j['name'] ?? '') as String,
        description: (j['description'] ?? '') as String,
        logo: (j['logo'] ?? '') as String,
        link: (j['link'] ?? '') as String,
      );
}

/// One printed admission ticket — its [code] is the gate-validation QR.
class KioskTicket {
  final String code;
  final String zoneNameMn;
  final String zoneNameEn;
  const KioskTicket({
    required this.code,
    required this.zoneNameMn,
    required this.zoneNameEn,
  });
  factory KioskTicket.fromJson(Map<String, dynamic> j) => KioskTicket(
        code: (j['code'] ?? '') as String,
        zoneNameMn: (j['zone_name_mn'] ?? '') as String,
        zoneNameEn: (j['zone_name_en'] ?? '') as String,
      );
  String zoneName(Lang lang) => lang == Lang.mn ? zoneNameMn : zoneNameEn;
}

/// Result of polling an order (`GET /api/kiosk/orders/:id/status`). When
/// [status] is paid, [tickets] and [ebarimt] are populated.
class KioskOrderStatus {
  final String orderId;
  final String reference;
  final PaymentStatus status;
  final int total;
  final String? paidAt;
  final List<KioskTicket> tickets;
  final EbarimtReceipt? ebarimt;

  const KioskOrderStatus({
    required this.orderId,
    required this.reference,
    required this.status,
    required this.total,
    this.paidAt,
    this.tickets = const [],
    this.ebarimt,
  });

  factory KioskOrderStatus.fromJson(Map<String, dynamic> j) {
    final eb = j['ebarimt'];
    return KioskOrderStatus(
      orderId: (j['order_id'] ?? '') as String,
      reference: (j['reference'] ?? '') as String,
      status: _statusFrom(j['status'] as String?),
      total: (j['total'] as num?)?.toInt() ?? 0,
      paidAt: j['paid_at'] as String?,
      tickets: [
        for (final t in (j['tickets'] ?? const []) as List)
          if (t is Map<String, dynamic>) KioskTicket.fromJson(t),
      ],
      ebarimt: eb is Map<String, dynamic> ? EbarimtReceipt.fromJson(eb) : null,
    );
  }
}

/// Fiscal receipt fields needed to print the e-barimt (issued by QPay on the
/// QR rail, by POSAPI on the card rail).
class EbarimtReceipt {
  final String qrData;
  final String lottery;
  const EbarimtReceipt({required this.qrData, required this.lottery});

  factory EbarimtReceipt.fromJson(Map<String, dynamic> j) => EbarimtReceipt(
        qrData: (j['qrData'] ?? j['ebarimt_qr_data'] ?? '') as String,
        lottery: (j['lottery'] ?? j['ebarimt_lottery'] ?? '') as String,
      );

  Map<String, String> toJson() => {'qrData': qrData, 'lottery': lottery};
}
