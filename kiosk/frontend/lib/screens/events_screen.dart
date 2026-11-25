import 'package:flutter/material.dart';
import '../data/events_scope.dart';
import '../l10n/strings.dart';
import '../models/event.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/event_card.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/reveal.dart';
import 'event_detail_screen.dart';

/// The cinema-style event feed — reached from the home hero's "Buy tickets" /
/// "What's on" actions.
class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  void _openEvent(BuildContext context, Event event) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EventDetailScreen(event: event)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final events = context.events;
    return KioskScaffold(
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(56, 24, 56, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(s.onSaleNow, style: KioskText.display.copyWith(fontSize: 40)),
                const SizedBox(width: 14),
                Text(s.eventsCount(events.length),
                    style: KioskText.body.copyWith(color: AppColors.textMuted, fontSize: 20)),
              ],
            ),
          ),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(56, 10, 56, 48),
              itemCount: events.length,
              separatorBuilder: (_, __) => const SizedBox(height: 44),
              itemBuilder: (context, i) => Reveal(
                delay: Duration(milliseconds: 80 + i * 90),
                child: EventCard(
                  event: events[i],
                  onTap: () => _openEvent(context, events[i]),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
