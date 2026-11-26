import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../config/kiosk_config.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../models/payment.dart';
import '../models/ticket_order.dart';
import '../services/bridge_service.dart';
import '../services/payment_service.dart';
import '../services/print_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/qr_placeholder.dart';
import '../widgets/receiver_picker.dart';
import 'confirmation_screen.dart';

/// Payment screen (portrait): order summary, then method choice + detail.
///
/// Live (KIOSK_API_BASE set): QPay creates a real invoice on the cs360 backend
/// and we show its QR + poll until paid; Card charges the on-box terminal via
/// the bridge then reports the result. Offline: both rails simulate so the UI
/// still runs with no backend.
class PaymentScreen extends StatefulWidget {
  final TicketOrder order;
  const PaymentScreen({super.key, required this.order});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  PaymentMethod? _method;
  bool _processing = false; // card / simulate spinner
  bool _printing = false; // holding the buyer until the slip is out
  /// Who the И-Баримт is written to, once the buyer has answered.
  Receiver? _receiver;

  /// True while the "Хувь хүн / Байгууллага" question is on screen.
  ///
  /// It is asked at a different moment on each rail, because that is where the
  /// barimt is actually written:
  ///   QPay — straight after the method is picked, since QPay stamps the
  ///          barimt the instant the invoice is paid and it cannot then be
  ///          re-issued to a company, so the company must be on the order.
  ///   Card — after the terminal approves, since the bridge issues that barimt
  ///          itself and the buyer should not be held up before paying.
  bool _askReceiver = false;

  /// The card order that is already paid and waiting for the answer above.
  KioskOrder? _cardOrder;
  bool _creating = false; // creating the QPay invoice
  KioskOrder? _order; // live QPay order (carries the QR)
  String? _error;

  static const _holdSeconds = 300;
  int _remaining = _holdSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _remaining--);
      if (_remaining <= 0) {
        t.cancel();
        _onHoldExpired();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _onHoldExpired() {
    if (!mounted) return;
    Navigator.of(context).popUntil((r) => r.isFirst);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(S.of(context).reservationExpired)),
    );
  }

  List<OrderLine> get _items =>
      [(zoneId: widget.order.zone.id, qty: widget.order.quantity)];

  List<Map<String, Object>> get _receiptLines => [
        {
          'name': widget.order.zone.nameEn,
          'qty': widget.order.quantity,
          'unitPrice': widget.order.zone.price,
        },
      ];

  // ---- Method selection -------------------------------------------------
  Future<void> _choose(PaymentMethod m) async {
    setState(() {
      _method = m;
      _error = null;
    });
    if (m == PaymentMethod.qpay && KioskConfig.isLive) {
      // Ask before the invoice exists — see [_askReceiver].
      setState(() => _askReceiver = true);
    } else if (m == PaymentMethod.card) {
      // Start the terminal read on this very tap. It used to draw a card panel
      // with a second "follow the terminal" button, which buyers read as the
      // machine being stuck — one payment, one tap.
      await _payCard();
    } else if (m == PaymentMethod.qpay) {
      await _startQpay(); // offline demo
    }
  }

  /// The buyer answered "Хувь хүн / Байгууллага"; carry on down their rail.
  Future<void> _onReceiverChosen(Receiver r) async {
    setState(() {
      _receiver = r;
      _askReceiver = false;
    });
    if (_method == PaymentMethod.card) {
      await _finishCard();
    } else {
      await _startQpay();
    }
  }

  // ---- QPay rail (cloud) ------------------------------------------------
  Future<void> _startQpay() async {
    setState(() {
      _creating = true;
      _order = null;
      _error = null;
    });
    try {
      final order = await PaymentService.createOrder(
        eventId: widget.order.event.id,
        items: _items,
        method: PaymentMethod.qpay,
        buyerPhone: widget.order.buyerPhone,
        customerTin: _receiver?.tin,
      );
      if (!mounted) return;
      setState(() {
        _order = order;
        _creating = false;
      });
      final result = await PaymentService.pollUntilSettled(order.orderId);
      if (!mounted) return;
      if (result.status == PaymentStatus.paid) {
        await _goConfirm(result);
      } else {
        setState(() => _error = _msg(context));
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _creating = false;
        _error = _msg(context);
      });
    }
  }

  // ---- Card rail (on-box terminal via the bridge) -----------------------
  Future<void> _payCard() async {
    setState(() {
      _processing = true;
      _error = null;
    });
    try {
      if (!KioskConfig.isLive) {
        await _simulate();
        return;
      }
      // The company is not known yet — it is asked for after approval — and
      // it is not needed here either: the bridge issues this rail's barimt
      // locally and records the buyer TIN with it.
      final order = await PaymentService.createOrder(
        eventId: widget.order.event.id,
        items: _items,
        method: PaymentMethod.card,
        buyerPhone: widget.order.buyerPhone,
      );
      final approved = await BridgeService.posCharge(
        orderRef: order.reference,
        amount: widget.order.total,
      );
      if (!mounted) return;
      if (!approved) {
        await PaymentService.cardResult(order.orderId, approved: false);
        if (!mounted) return;
        setState(() {
          _processing = false;
          _error = _msg(context);
        });
        return;
      }
      // Paid. The buyer is no longer racing the reservation hold, and must not
      // have the screen pulled out from under them while they answer.
      _timer?.cancel();
      setState(() {
        _cardOrder = order;
        _processing = false;
        _askReceiver = true;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _processing = false;
        _error = _msg(context);
      });
    }
  }

  /// Card rail, part two: write the barimt to whoever the buyer named, then
  /// report the charge so the backend settles the order and mints tickets.
  Future<void> _finishCard() async {
    final order = _cardOrder;
    if (order == null) return;
    setState(() => _processing = true);
    try {
      EbarimtReceipt? eb;
      try {
        eb = await BridgeService.issueEbarimt(
          orderRef: order.reference,
          items: _receiptLines,
          customerTin: _receiver?.tin,
        );
      } catch (_) {
        // The card is already charged. A barimt that cannot be issued right
        // now must not cost the buyer their tickets — report the sale anyway.
        eb = null;
      }
      final result = await PaymentService.cardResult(
        order.orderId,
        approved: true,
        ebarimt: eb,
      );
      if (!mounted) return;
      if (result.status == PaymentStatus.paid) {
        await _goConfirm(result);
      } else {
        setState(() {
          _processing = false;
          _error = _msg(context);
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _processing = false;
        _error = _msg(context);
      });
    }
  }

  // ---- Offline simulation ----------------------------------------------
  Future<void> _simulate() async {
    setState(() => _processing = true);
    await Future.delayed(const Duration(seconds: 2));
    if (!mounted) return;
    await _goConfirm(_simulatedResult());
  }

  KioskOrderStatus _simulatedResult() {
    final ref = 'NS-${widget.order.event.id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase()}'
        '-${1000 + widget.order.total % 9000}';
    return KioskOrderStatus(
      orderId: ref,
      reference: ref,
      status: PaymentStatus.paid,
      total: widget.order.total,
      tickets: [
        for (var i = 0; i < widget.order.quantity; i++)
          KioskTicket(
            code: '$ref-${i + 1}',
            zoneNameMn: widget.order.zone.nameMn,
            zoneNameEn: widget.order.zone.nameEn,
          ),
      ],
    );
  }

  Future<void> _goConfirm(KioskOrderStatus result) async {
    _timer?.cancel();
    // The bridge's auto-printer picks the paid order up from the cloud and
    // prints the ticket + И-Баримт a beat later. Hold the buyer here until the
    // paper is actually out, otherwise they walk off at the thank-you screen
    // while their receipt is still coming.
    await _waitForPrint(result.orderId);
    if (!mounted) return;
    final confirmed =
        widget.order.copyWith(method: _method, reference: result.reference);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => ConfirmationScreen(order: confirmed, result: result),
      ),
    );
  }

  /// Poll the bridge until the slip is printed, or give up after 90s.
  ///
  /// Giving up still continues to the confirmation screen: the payment has
  /// already succeeded, so a slow printer must never look like a failed sale.
  Future<void> _waitForPrint(String orderRef) async {
    if (!KioskConfig.isLive) return;
    setState(() {
      _processing = false;
      _printing = true;
    });
    final deadline = DateTime.now().add(const Duration(seconds: 90));
    while (mounted && DateTime.now().isBefore(deadline)) {
      if (await PrintService.hasPrinted(orderRef)) break;
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    if (mounted) setState(() => _printing = false);
  }

  String _msg(BuildContext context) => context.lang == Lang.mn
      ? 'Төлбөр амжилтгүй. Дахин оролдоно уу.'
      : 'Payment failed. Please try again.';

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return KioskScaffold(
      // No way back once the card is charged and we are only asking who the
      // barimt belongs to.
      showBack: !_processing &&
          !_printing &&
          !(_askReceiver && _method == PaymentMethod.card),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(56, 28, 56, 36),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _summary(context, widget.order),
            const SizedBox(height: 36),
            if (_printing)
              _printingView(s)
            else if (_processing)
              _processingView(s)
            else if (_askReceiver)
              ReceiverPicker(onChosen: _onReceiverChosen)
            else ...[
              Text(s.howToPay, style: KioskText.h1),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: _MethodCard(
                      title: s.qpay,
                      subtitle: s.qpaySub,
                      icon: Icons.qr_code_2_rounded,
                      selected: _method == PaymentMethod.qpay,
                      onTap: () => _choose(PaymentMethod.qpay),
                    ),
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    child: _MethodCard(
                      title: s.bankCard,
                      subtitle: s.bankCardSub,
                      icon: Icons.credit_card_rounded,
                      selected: _method == PaymentMethod.card,
                      onTap: () => _choose(PaymentMethod.card),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              _methodDetail(s),
            ],
          ],
        ),
      ),
    );
  }

  // ---- Order summary ----------------------------------------------------
  Widget _summary(BuildContext context, TicketOrder order) {
    final s = S.of(context);
    final lang = context.lang;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(s.order, style: KioskText.label),
          const SizedBox(height: 14),
          Text(order.event.title, style: KioskText.h1),
          const SizedBox(height: 24),
          _line(s.when, s.eventWhen(order.event)),
          order.event.isRink
              ? _line(s.skatesLabel, s.sizeLabel(order.zone.nameMn))
              : _line(s.zone, order.zone.name(lang)),
          if (order.buyerPhone != null) _line(s.phoneLabel, order.buyerPhone!),
          _line(s.quantityLabel, '${order.quantity}'),
          _line(s.unitPrice, formatMnt(order.zone.price)),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(s.totalPlain, style: KioskText.title),
              Text(formatMnt(order.total), style: KioskText.display.copyWith(fontSize: 40)),
            ],
          ),
          // The reservation countdown is meaningless once the money is taken —
          // the card rail keeps this screen up afterwards to ask who the
          // barimt belongs to.
          if (_cardOrder == null) ...[
            const SizedBox(height: 24),
            _holdBanner(s),
          ],
        ],
      ),
    );
  }

  Widget _line(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 150, child: Text(label, style: KioskText.body.copyWith(fontSize: 17))),
          Expanded(
            child: Text(value, style: KioskText.title.copyWith(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  Widget _holdBanner(S s) {
    final mm = (_remaining ~/ 60).toString();
    final ss = (_remaining % 60).toString().padLeft(2, '0');
    final low = _remaining <= 60;
    final color = low ? AppColors.danger : AppColors.inkSoft;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.glassHi,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: low ? AppColors.danger.withValues(alpha: 0.55) : AppColors.stroke),
      ),
      child: Row(
        children: [
          Icon(Icons.schedule_rounded, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(s.ticketsHeld,
                style: KioskText.body.copyWith(fontSize: 16, color: AppColors.inkSoft)),
          ),
          Text('$mm:$ss',
              style: KioskText.title.copyWith(
                  fontFeatures: const [FontFeature.tabularFigures()], color: color)),
        ],
      ),
    );
  }

  /// A one-line reminder of who the barimt goes to, with a way back.
  Widget _receiverBanner(S s) {
    final r = _receiver!;
    final who = r.isCompany
        ? (r.name.isEmpty ? '${s.tinShort} ${r.tin}' : r.name)
        : s.asPerson;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.glassHi,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.stroke),
      ),
      child: Row(
        children: [
          Icon(r.isCompany ? Icons.apartment_rounded : Icons.person_rounded,
              size: 22, color: AppColors.textSoft),
          const SizedBox(width: 12),
          Expanded(
            child: Text('${s.receiptTo}: $who',
                style: KioskText.body.copyWith(fontSize: 17, color: AppColors.text)),
          ),
        ],
      ),
    );
  }

  // ---- Method detail ----------------------------------------------------
  Widget _methodDetail(S s) {
    if (_method == null) {
      return _Card(
        center: true,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 28),
          child: Text(s.selectMethod, textAlign: TextAlign.center, style: KioskText.body),
        ),
      );
    }
    if (_method == PaymentMethod.qpay) return _qpayDetail(s);
    return _cardDetail(s);
  }

  Widget _qpayDetail(S s) {
    if (_creating) {
      return _Card(
        center: true,
        child: const Padding(
          padding: EdgeInsets.symmetric(vertical: 40),
          child: CircularProgressIndicator(strokeWidth: 4, color: AppColors.magenta),
        ),
      );
    }
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (_receiver != null) ...[
            _receiverBanner(s),
            const SizedBox(height: 22),
          ],
          Text(s.scanToPay, style: KioskText.title),
          const SizedBox(height: 22),
          // Live: the real QPay PNG. Offline: the decorative placeholder.
          if (_order != null && _order!.hasQr)
            _RealQr(bytes: _order!.qrImageBytes, size: 280)
          else
            QrPlaceholder(
              data: 'qpay:invoice:${widget.order.total}:${widget.order.zone.id}',
              size: 280,
            ),
          const SizedBox(height: 22),
          if (_error != null) ...[
            Text(_error!, textAlign: TextAlign.center, style: KioskText.body.copyWith(color: AppColors.danger)),
            const SizedBox(height: 16),
            PrimaryButton(label: s.scanToPay, icon: Icons.refresh_rounded, onPressed: _startQpay),
          ] else if (KioskConfig.isLive)
            Text(s.waitingConfirm, style: KioskText.body.copyWith(fontSize: 16))
          else ...[
            Text(s.waitingConfirm, style: KioskText.body.copyWith(fontSize: 16)),
            const SizedBox(height: 24),
            PrimaryButton(label: s.simulatePaid, icon: Icons.check_rounded, onPressed: _simulate),
          ],
        ],
      ),
    );
  }

  Widget _cardDetail(S s) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Icon(Icons.contactless_rounded, size: 96, color: AppColors.magenta),
          const SizedBox(height: 22),
          Text(s.cardPrompt, textAlign: TextAlign.center, style: KioskText.title),
          const SizedBox(height: 14),
          Text(formatMnt(widget.order.total), style: KioskText.display.copyWith(fontSize: 34)),
          const SizedBox(height: 24),
          if (_error != null) ...[
            Text(_error!, textAlign: TextAlign.center, style: KioskText.body.copyWith(color: AppColors.danger)),
            const SizedBox(height: 16),
          ],
          // Live: the charge already started when the buyer tapped "Bank card",
          // so a button here only makes sense as a retry after a decline.
          if (!KioskConfig.isLive)
            PrimaryButton(
              label: s.simulateApproved,
              icon: Icons.check_rounded,
              onPressed: _payCard,
            )
          else if (_error != null)
            PrimaryButton(
              label: s.tryAgain,
              icon: Icons.refresh_rounded,
              onPressed: _payCard,
            ),
        ],
      ),
    );
  }

  /// "Та баримт хэвлэх хүртэл түр хүлээнэ үү" — shown between a successful
  /// payment and the confirmation screen while the printer runs.
  Widget _printingView(S s) {
    return _Card(
      center: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 56),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 56,
              height: 56,
              child: CircularProgressIndicator(strokeWidth: 4, color: AppColors.magenta),
            ),
            const SizedBox(height: 28),
            Text(s.waitingPrint, textAlign: TextAlign.center, style: KioskText.title),
            const SizedBox(height: 14),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                s.waitingPrintSub,
                textAlign: TextAlign.center,
                style: KioskText.body.copyWith(fontSize: 17),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _processingView(S s) {
    return _Card(
      center: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 56,
              height: 56,
              child: CircularProgressIndicator(strokeWidth: 4, color: AppColors.magenta),
            ),
            const SizedBox(height: 28),
            Text(s.confirmingPayment, style: KioskText.title),
          ],
        ),
      ),
    );
  }
}

/// The real QPay QR, framed to match [QrPlaceholder].
class _RealQr extends StatelessWidget {
  final Uint8List bytes;
  final double size;
  const _RealQr({required this.bytes, required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(size * 0.035),
      decoration: BoxDecoration(
        gradient: AppColors.brand,
        borderRadius: BorderRadius.circular(size * 0.10),
        boxShadow: [
          BoxShadow(color: AppColors.magenta.withValues(alpha: 0.4), blurRadius: 30, spreadRadius: -4),
        ],
      ),
      child: Container(
        width: size,
        height: size,
        padding: EdgeInsets.all(size * 0.08),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(size * 0.07),
        ),
        child: Image.memory(bytes, fit: BoxFit.contain, filterQuality: FilterQuality.none),
      ),
    );
  }
}

/// White card with a hairline border — the minimal container used throughout.
class _Card extends StatelessWidget {
  final Widget child;
  final bool center;
  const _Card({required this.child, this.center = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      alignment: center ? Alignment.center : null,
      decoration: AppDeco.glass(radius: 24),
      child: child,
    );
  }
}

class _MethodCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  const _MethodCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: AppDeco.glass(
        radius: 16,
        selected: selected,
        glow: selected ? AppColors.magenta : null,
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    gradient: selected ? AppColors.brand : null,
                    color: selected ? null : AppColors.glassHi,
                    border: selected ? null : Border.all(color: AppColors.stroke),
                  ),
                  child: Icon(icon, size: 30, color: selected ? AppColors.onAccent : AppColors.textSoft),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: KioskText.title),
                      const SizedBox(height: 4),
                      Text(subtitle, style: KioskText.body.copyWith(fontSize: 15)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
