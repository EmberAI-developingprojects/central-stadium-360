import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../models/event.dart';
import '../models/ticket_order.dart';
import '../models/zone.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';
import '../widgets/event_banner.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/quantity_selector.dart';
import '../widgets/zone_tile.dart';
import 'payment_screen.dart';
import 'rink_phone_screen.dart';

/// Event detail (portrait): scrollable hero + zone picker, with the
/// quantity/total/continue bar pinned at the bottom.
class EventDetailScreen extends StatefulWidget {
  final Event event;
  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  Zone? _selected;
  int _qty = 1;

  int get _total => (_selected?.price ?? 0) * _qty;
  int get _maxQty {
    final avail = _selected?.available ?? 0;
    return avail < 8 ? avail : 8;
  }

  void _continue() {
    final order = TicketOrder(event: widget.event, zone: _selected!, quantity: _qty);
    // A rink ticket needs the buyer's phone (LED board, SMS) before payment.
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => widget.event.isRink
            ? RinkPhoneScreen(order: order)
            : PaymentScreen(order: order),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final s = S.of(context);
    final lang = context.lang;
    return KioskScaffold(
      showBack: true,
      child: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(56, 28, 56, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero banner
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: AppDeco.artGlow(event.tint),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: EventBanner(event: event),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(event.subtitle(lang).toUpperCase(), style: KioskText.label),
                  const SizedBox(height: 12),
                  Text(event.title, style: KioskText.display),
                  const SizedBox(height: 24),
                  if (event.isRink) ...[
                    _infoRow(Icons.timer_outlined, s.rinkDuration(event.rinkDurationMinutes ?? 0)),
                    const SizedBox(height: 14),
                    _infoRow(Icons.qr_code_scanner_rounded, s.rinkStartsAtScan),
                    const SizedBox(height: 14),
                    _infoRow(Icons.info_outline_rounded, s.rinkOvertimeNote),
                  ] else ...[
                    _infoRow(Icons.calendar_today_rounded, s.eventDate(event.startsAt)),
                    const SizedBox(height: 14),
                    _infoRow(Icons.place_outlined, event.venue),
                  ],
                  const SizedBox(height: 22),
                  Text(event.description(lang), style: KioskText.body),
                  const SizedBox(height: 40),
                  // Zones
                  Text(event.isRink ? s.chooseSize : s.chooseZone, style: KioskText.h1),
                  const SizedBox(height: 8),
                  Text(event.isRink ? s.sizesHint : s.zonesHint,
                      style: KioskText.body.copyWith(fontSize: 17)),
                  const SizedBox(height: 22),
                  ...event.zones.map((z) => Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: ZoneTile(
                          zone: z,
                          title: event.isRink ? s.sizeLabel(z.nameMn) : null,
                          selected: _selected?.id == z.id,
                          onTap: () => setState(() {
                            _selected = z;
                            _qty = 1;
                          }),
                        ),
                      )),
                ],
              ),
            ),
          ),
          _checkoutBar(),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: AppColors.inkSoft, size: 22),
        const SizedBox(width: 14),
        Expanded(child: Text(text, style: KioskText.title.copyWith(fontWeight: FontWeight.w500))),
      ],
    );
  }

  Widget _checkoutBar() {
    final s = S.of(context);
    final hasZone = _selected != null;
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.paper,
        border: Border(top: BorderSide(color: AppColors.line)),
      ),
      padding: const EdgeInsets.fromLTRB(56, 24, 56, 32),
      child: Column(
        children: [
          Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(s.quantity, style: KioskText.label.copyWith(fontSize: 11)),
                  const SizedBox(height: 10),
                  QuantitySelector(
                    value: _qty,
                    max: _maxQty < 1 ? 1 : _maxQty,
                    onChanged: (v) => setState(() => _qty = v),
                  ),
                ],
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(s.total, style: KioskText.label.copyWith(fontSize: 11)),
                  const SizedBox(height: 6),
                  Text(hasZone ? formatMnt(_total) : '—',
                      style: KioskText.display.copyWith(fontSize: 40)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            label: s.continueToPayment,
            icon: Icons.arrow_forward_rounded,
            expand: true,
            onPressed: hasZone ? _continue : null,
          ),
        ],
      ),
    );
  }
}
