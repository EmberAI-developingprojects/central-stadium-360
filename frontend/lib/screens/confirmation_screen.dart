import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../models/payment.dart';
import '../models/ticket_order.dart';
import '../services/email_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';
import '../widgets/event_banner.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/mascot.dart';
import '../widgets/on_screen_keyboard.dart';
import '../widgets/qr_view.dart';

/// Success screen (portrait): celebrating mascot + heading on top, then the
/// **digital** entry-ticket QR(s) and the И-Баримт fiscal receipt QR below.
///
/// This is a smart, paperless kiosk — nothing is printed. The buyer scans or
/// photographs the codes with their phone. Auto-returns home after a while.
class ConfirmationScreen extends StatefulWidget {
  final TicketOrder order;

  /// The settled order from the backend (tickets + И-Баримт). Null when the
  /// screen is shown standalone / offline — a result is then derived from
  /// [order].
  final KioskOrderStatus? result;

  const ConfirmationScreen({super.key, required this.order, this.result});

  @override
  State<ConfirmationScreen> createState() => _ConfirmationScreenState();
}

enum _EmailPhase { idle, entry, sending, sent, error }

class _ConfirmationScreenState extends State<ConfirmationScreen> {
  Timer? _returnTimer;

  // Email-the-ticket state.
  _EmailPhase _phase = _EmailPhase.idle;
  String _email = '';
  String _sentTo = '';

  late final KioskOrderStatus _result = widget.result ?? _fromOrder();

  @override
  void initState() {
    super.initState();
    // All-digital: nothing to print. Give the buyer enough time to
    // scan/photograph their ticket and И-Баримт before auto-returning home.
    _scheduleReturn(const Duration(seconds: 60));
  }

  /// (Re)arm the idle auto-return-home timer. Cancelled while the buyer is
  /// typing their email so the screen never disappears mid-entry.
  void _scheduleReturn(Duration after) {
    _returnTimer?.cancel();
    _returnTimer = Timer(after, _goHome);
  }

  KioskOrderStatus _fromOrder() {
    final o = widget.order;
    final ref = o.reference ?? 'NS-TICKET';
    return KioskOrderStatus(
      orderId: ref,
      reference: ref,
      status: PaymentStatus.paid,
      total: o.total,
      tickets: [
        for (var i = 0; i < o.quantity; i++)
          KioskTicket(code: '$ref-${i + 1}', zoneNameMn: o.zone.nameMn, zoneNameEn: o.zone.nameEn),
      ],
    );
  }

  void _goHome() {
    if (!mounted) return;
    Navigator.of(context).popUntil((r) => r.isFirst);
  }

  void _openEmailEntry() {
    _returnTimer?.cancel(); // don't time out while typing
    setState(() {
      _phase = _EmailPhase.entry;
      _email = '';
    });
  }

  void _cancelEmailEntry() {
    setState(() => _phase = _EmailPhase.idle);
    _scheduleReturn(const Duration(seconds: 45));
  }

  Future<void> _sendEmail() async {
    final to = _email.trim();
    if (!EmailService.looksValid(to)) return; // Send is disabled, but guard anyway
    setState(() => _phase = _EmailPhase.sending);
    final tickets = _result.tickets.isNotEmpty
        ? _result.tickets
        : [
            KioskTicket(
                code: _result.reference,
                zoneNameMn: widget.order.zone.nameMn,
                zoneNameEn: widget.order.zone.nameEn)
          ];
    try {
      await EmailService.sendTicket(
        to: to,
        orderRef: _result.reference,
        event: widget.order.event.title,
        startsAt: widget.order.event.startsAt,
        venue: widget.order.event.venue,
        total: _result.total,
        tickets: tickets,
        ebarimt: _result.ebarimt,
        lang: context.lang == Lang.mn ? 'mn' : 'en',
      );
      if (!mounted) return;
      setState(() {
        _sentTo = to;
        _phase = _EmailPhase.sent;
      });
      _scheduleReturn(const Duration(seconds: 20));
    } catch (_) {
      if (!mounted) return;
      setState(() => _phase = _EmailPhase.error);
    }
  }

  @override
  void dispose() {
    _returnTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    final s = S.of(context);
    return KioskScaffold(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(56, 24, 56, 36),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ---- Celebrate (Khulan portrait) ------------------------
            Center(child: _hostAvatar(232)),
            const SizedBox(height: 18),
            Center(child: Text(s.confirmed, style: KioskText.label.copyWith(color: AppColors.accent))),
            const SizedBox(height: 12),
            Center(child: Text(s.enjoyShow, style: KioskText.display)),
            const SizedBox(height: 12),
            Center(
              child: SizedBox(
                width: 600,
                child: Text(s.confirmIntro, textAlign: TextAlign.center, style: KioskText.body),
              ),
            ),
            const SizedBox(height: 36),
            // ---- Ticket + И-Баримт -----------------------------------
            _ticketCard(context, order),
          ],
        ),
      ),
    );
  }

  /// A circular celebratory portrait of the host (Khulan), framed in gold.
  /// Falls back to the hand-drawn celebrating mascot if the asset is missing.
  Widget _hostAvatar(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.75), width: 3),
        boxShadow: [
          BoxShadow(color: AppColors.magenta.withValues(alpha: 0.40), blurRadius: 48, spreadRadius: -6),
          const BoxShadow(color: Color(0x66000000), blurRadius: 26, offset: Offset(0, 14)),
        ],
      ),
      child: ClipOval(
        child: Stack(
          fit: StackFit.expand,
          children: [
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [AppColors.bg2, AppColors.bg0],
                ),
              ),
            ),
            Image.asset(
              'assets/character/host.png',
              fit: BoxFit.fitWidth,
              alignment: Alignment.topCenter,
              filterQuality: FilterQuality.high,
              errorBuilder: (_, __, ___) =>
                  const Mascot(size: 232, mood: MascotMood.celebrate),
            ),
          ],
        ),
      ),
    );
  }

  Widget _ticketCard(BuildContext context, TicketOrder order) {
    final s = S.of(context);
    final lang = context.lang;
    final tickets = _result.tickets.isNotEmpty
        ? _result.tickets
        : [KioskTicket(code: _result.reference, zoneNameMn: order.zone.nameMn, zoneNameEn: order.zone.nameEn)];
    final ebarimt = _result.ebarimt;
    return Container(
      padding: const EdgeInsets.all(36),
      decoration: AppDeco.glass(radius: 24, glow: AppColors.violet, glowOpacity: 0.22),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: EventBanner(event: order.event),
          ),
          const SizedBox(height: 24),
          Text(order.event.title, style: KioskText.h1),
          const SizedBox(height: 10),
          Text(s.eventDate(order.event.startsAt), style: KioskText.body.copyWith(fontSize: 17)),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${order.zone.name(lang)}  ·  ×${order.quantity}',
                        style: KioskText.title.copyWith(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 8),
                    Text(_result.reference,
                        style: KioskText.body.copyWith(
                            fontSize: 15,
                            color: AppColors.muted,
                            fontFeatures: const [FontFeature.tabularFigures()])),
                  ],
                ),
              ),
              Text(formatMnt(_result.total), style: KioskText.price),
            ],
          ),

          // ---- Entry-ticket QR(s) ----------------------------------
          const SizedBox(height: 28),
          const Divider(height: 1),
          const SizedBox(height: 24),
          Text(s.yourTicket, style: KioskText.label.copyWith(color: AppColors.accent)),
          const SizedBox(height: 6),
          Text(s.showAtGate, style: KioskText.body.copyWith(fontSize: 15, color: AppColors.muted)),
          const SizedBox(height: 20),
          for (var i = 0; i < tickets.length; i++) ...[
            _ticketQr(s, lang, tickets[i], i, tickets.length),
            if (i != tickets.length - 1) const SizedBox(height: 24),
          ],

          // ---- И-Баримт fiscal receipt QR --------------------------
          if (ebarimt != null && ebarimt.qrData.isNotEmpty) ...[
            const SizedBox(height: 28),
            const Divider(height: 1),
            const SizedBox(height: 24),
            Text(s.ebarimtTitle, style: KioskText.label.copyWith(color: AppColors.accent)),
            const SizedBox(height: 6),
            Text(s.ebarimtSub, style: KioskText.body.copyWith(fontSize: 15, color: AppColors.muted)),
            const SizedBox(height: 20),
            Center(child: QrView(data: ebarimt.qrData, size: 200)),
            if (ebarimt.lottery.isNotEmpty) ...[
              const SizedBox(height: 14),
              Center(
                child: Text('${s.lotteryLabel}: ${ebarimt.lottery}',
                    style: KioskText.title.copyWith(
                        fontWeight: FontWeight.w500,
                        fontFeatures: const [FontFeature.tabularFigures()])),
              ),
            ],
          ],

          // ---- Email the ticket ------------------------------------
          const SizedBox(height: 28),
          const Divider(height: 1),
          const SizedBox(height: 24),
          _emailSection(s),

          // ---- Footer ----------------------------------------------
          const SizedBox(height: 24),
          Center(
            child: SizedBox(
              width: 560,
              child: Text(s.keepPhotoHint,
                  textAlign: TextAlign.center,
                  style: KioskText.body.copyWith(fontSize: 15, color: AppColors.muted)),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Text(s.returningSoon,
                  style: KioskText.body.copyWith(fontSize: 15, color: AppColors.muted)),
              const Spacer(),
              GhostButton(label: s.done, onPressed: _goHome),
            ],
          ),
        ],
      ),
    );
  }

  /// "Email my ticket" — collapsed to a button until tapped, then an inline
  /// on-screen keyboard (the kiosk has no physical keyboard), then status.
  Widget _emailSection(S s) {
    switch (_phase) {
      case _EmailPhase.idle:
        return Center(child: GhostButton(label: s.emailTicket, icon: Icons.mail_outline, onPressed: _openEmailEntry));

      case _EmailPhase.sending:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.magenta)),
            const SizedBox(width: 14),
            Text(s.sending, style: KioskText.title.copyWith(fontWeight: FontWeight.w500)),
          ],
        );

      case _EmailPhase.sent:
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 28),
            const SizedBox(width: 12),
            Flexible(child: Text(s.emailSent(_sentTo), style: KioskText.title.copyWith(fontWeight: FontWeight.w500))),
          ],
        );

      case _EmailPhase.entry:
      case _EmailPhase.error:
        final valid = EmailService.looksValid(_email);
        final showInvalid = _email.trim().isNotEmpty && !valid;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.emailPrompt, style: KioskText.label.copyWith(color: AppColors.accent)),
            const SizedBox(height: 12),
            // The typed address.
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.bg1,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.strokeHi, width: 1.4),
              ),
              child: Text(
                _email.isEmpty ? s.emailHint : _email,
                style: KioskText.title.copyWith(
                  fontWeight: FontWeight.w500,
                  color: _email.isEmpty ? AppColors.muted : AppColors.text,
                ),
              ),
            ),
            if (_phase == _EmailPhase.error) ...[
              const SizedBox(height: 8),
              Text(s.emailFailed, style: KioskText.body.copyWith(fontSize: 15, color: AppColors.danger)),
            ] else if (showInvalid) ...[
              const SizedBox(height: 8),
              Text(s.invalidEmail, style: KioskText.body.copyWith(fontSize: 15, color: AppColors.danger)),
            ],
            const SizedBox(height: 16),
            OnScreenKeyboard(value: _email, onChanged: (v) => setState(() => _email = v)),
            const SizedBox(height: 16),
            Row(
              children: [
                GhostButton(label: s.cancel, onPressed: _cancelEmailEntry),
                const Spacer(),
                PrimaryButton(label: s.send, icon: Icons.send_rounded, onPressed: valid ? _sendEmail : null),
              ],
            ),
          ],
        );
    }
  }

  /// One entry ticket: its scannable gate QR plus zone + (when there is more
  /// than one) a "Ticket i of n" caption.
  Widget _ticketQr(S s, Lang lang, KioskTicket t, int index, int count) {
    return Column(
      children: [
        Center(child: QrView(data: t.code, size: 240)),
        const SizedBox(height: 12),
        Text(
          count > 1 ? '${t.zoneName(lang)}  ·  ${s.ticketIndex(index + 1, count)}' : t.zoneName(lang),
          style: KioskText.title.copyWith(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 4),
        Text(t.code,
            style: KioskText.body.copyWith(
                fontSize: 14,
                color: AppColors.muted,
                fontFeatures: const [FontFeature.tabularFigures()])),
      ],
    );
  }
}
