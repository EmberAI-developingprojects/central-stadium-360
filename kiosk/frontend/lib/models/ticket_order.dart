import 'event.dart';
import 'zone.dart';

/// Payment methods offered at the kiosk.
enum PaymentMethod { qpay, card }

/// A draft order assembled as the customer moves through the flow:
/// event -> zone + quantity -> payment -> confirmation.
///
/// Money is computed here only for display. The backend is authoritative for
/// totals, capacity holds and the fiscal receipt.
class TicketOrder {
  final Event event;
  final Zone zone;
  final int quantity;
  final PaymentMethod? method;

  /// Order reference, assigned by the backend on success. Mocked here.
  final String? reference;

  /// Rink only: the buyer's 8-digit mobile, for the LED board and the SMS.
  final String? buyerPhone;

  const TicketOrder({
    required this.event,
    required this.zone,
    required this.quantity,
    this.method,
    this.reference,
    this.buyerPhone,
  });

  int get total => zone.price * quantity;

  TicketOrder copyWith({
    int? quantity,
    PaymentMethod? method,
    String? reference,
    String? buyerPhone,
  }) {
    return TicketOrder(
      event: event,
      zone: zone,
      quantity: quantity ?? this.quantity,
      method: method ?? this.method,
      reference: reference ?? this.reference,
      buyerPhone: buyerPhone ?? this.buyerPhone,
    );
  }
}
