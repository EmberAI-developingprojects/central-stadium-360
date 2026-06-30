import 'package:flutter/material.dart';
import '../data/events_scope.dart';
import '../l10n/strings.dart';
import '../models/event.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/hero_character.dart';
import '../widgets/home_action_button.dart';
import '../widgets/kiosk_scaffold.dart';
import '../widgets/reveal.dart';
import '../widgets/upcoming_banner.dart';
import 'event_detail_screen.dart';
import 'events_screen.dart';

/// Landing screen (portrait): an "upcoming events" banner across the top, then
/// the venue's virtual host (Khulan) as a big borderless figure on the left and
/// the large action menu (buy / what's on / FAQ / help) on the right.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  /// Catalog sorted by date for the upcoming-events slideshow.
  List<Event> _upcoming(List<Event> events) =>
      [...events]..sort((a, b) => a.startsAt.compareTo(b.startsAt));

  void _openEvents(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const EventsScreen()),
    );
  }

  void _openEvent(BuildContext context, Event event) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EventDetailScreen(event: event)),
    );
  }

  void _showHelp(BuildContext context) {
    final s = S.of(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.stroke),
        ),
        title: Row(
          children: [
            const Icon(Icons.support_agent_rounded, color: AppColors.magenta, size: 30),
            const SizedBox(width: 12),
            Text(s.assistantName, style: KioskText.h2),
          ],
        ),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Text(s.helpBody, style: KioskText.body),
        ),
        actions: [
          GhostButton(label: s.done, onPressed: () => Navigator.of(ctx).pop()),
        ],
      ),
    );
  }

  void _showFaq(BuildContext context) {
    final s = S.of(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.bg1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.stroke),
        ),
        title: Row(
          children: [
            const Icon(Icons.help_outline_rounded, color: AppColors.magenta, size: 30),
            const SizedBox(width: 12),
            Text(s.faq, style: KioskText.h2),
          ],
        ),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 640),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final (q, a) in s.faqItems)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(q, style: KioskText.title.copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 8),
                        Text(a, style: KioskText.body.copyWith(fontSize: 17)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        actions: [
          GhostButton(label: s.done, onPressed: () => Navigator.of(ctx).pop()),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return KioskScaffold(
      // Full-width event hero band at the very top, above the logo/clock bar.
      banner: Reveal(
        child: UpcomingBanner(
          events: _upcoming(context.events),
          onOpen: (e) => _openEvent(context, e),
          radius: 0,
          height: 460,
        ),
      ),
      child: Padding(
        // No bottom padding on the host side so she reaches the screen edge
        // (knee crop sits flush at the bottom, no gap beneath her).
        padding: const EdgeInsets.fromLTRB(56, 18, 56, 0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
                  // Borderless host: fills the column width and stands tall,
                  // cropped at the knee by the bottom of the frame.
                  Expanded(
                    child: Reveal(child: const HeroCharacter()),
                  ),
                  const SizedBox(width: 20),
                  // Action menu — vertically centered, with its own bottom inset.
                  SizedBox(
                    width: 384,
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(s.welcome, style: KioskText.label.copyWith(color: AppColors.magenta)),
                          const SizedBox(height: 12),
                          Text(s.heroTagline, style: KioskText.h1),
                          const SizedBox(height: 32),
                          Reveal(
                            delay: const Duration(milliseconds: 140),
                            child: HomeActionButton(
                              icon: Icons.confirmation_number_rounded,
                              title: s.buyTickets,
                              subtitle: s.buyTicketsSub,
                              primary: true,
                              onTap: () => _openEvents(context),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Reveal(
                            delay: const Duration(milliseconds: 220),
                            child: HomeActionButton(
                              icon: Icons.event_rounded,
                              title: s.browseEvents,
                              subtitle: s.browseEventsSub,
                              onTap: () => _openEvents(context),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Reveal(
                            delay: const Duration(milliseconds: 300),
                            child: HomeActionButton(
                              icon: Icons.help_outline_rounded,
                              title: s.faq,
                              subtitle: s.faqSub,
                              onTap: () => _showFaq(context),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Reveal(
                            delay: const Duration(milliseconds: 380),
                            child: HomeActionButton(
                              icon: Icons.support_agent_rounded,
                              title: s.askHelp,
                              subtitle: s.askHelpSub,
                              onTap: () => _showHelp(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
