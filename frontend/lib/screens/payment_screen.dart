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
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/qr_placeholder.dart';
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
      );
      if (!mounted) return;
      setState(() {
        _order = order;
        _creating = false;
      });
      final result = await PaymentService.pollUntilSettled(order.orderId);
      if (!mounted) return;
      if (result.status == PaymentStatus.paid) {
        _goConfirm(result);
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
      final order = await PaymentService.createOrder(
        eventId: widget.order.event.id,
        items: _items,
        method: PaymentMethod.card,
      );
      final approved = await BridgeService.posCharge(
        orderRef: order.reference,
        amount: widget.order.total,
      );
      EbarimtReceipt? eb;
      if (approved) {
        eb = await BridgeService.issueEbarimt(
          orderRef: order.reference,
          items: _receiptLines,
        );
      }
      final result = await PaymentService.cardResult(
        order.orderId,
        approved: approved,
        ebarimt: eb,
      );
      if (!mounted) return;
      if (result.status == PaymentStatus.paid) {
        _goConfirm(result);
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
    _goConfirm(_simulatedResult());
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

  void _goConfirm(KioskOrderStatus result) {
    _timer?.cancel();
    final confirmed =
        widget.order.copyWith(method: _method, reference: result.reference);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => ConfirmationScreen(order: confirmed, result: result),
      ),
    );
  }

  String _msg(BuildContext context) => context.lang == Lang.mn
      ? 'Төлбөр амжилтгүй. Дахин оролдоно уу.'
      : 'Payment failed. Please try again.';

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return KioskScaffold(
      showBack: !_processing,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(56, 28, 56, 36),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _summary(context, widget.order),
            const SizedBox(height: 36),
            if (_processing)
              _processingView(s)
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
          _line(s.when, s.eventDate(order.event.startsAt)),
          _line(s.zone, order.zone.name(lang)),
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
          const SizedBox(height: 24),
          _holdBanner(s),
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
          PrimaryButton(
            label: KioskConfig.isLive ? s.cardPrompt : s.simulateApproved,
            icon: Icons.check_rounded,
            onPressed: _payCard,
          ),
        ],
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
