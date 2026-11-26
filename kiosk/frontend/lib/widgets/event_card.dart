import 'package:flutter/material.dart';
import '../l10n/strings.dart';
import '../models/event.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';
import 'event_banner.dart';

/// A cinema-style event card: the full banner artwork framed like a poster and
/// lit with the event's own tint glow, with a slim info strip underneath.
class EventCard extends StatelessWidget {
  final Event event;
  final VoidCallback onTap;
  const EventCard({super.key, required this.event, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final soldOut = !event.anyAvailable;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: soldOut ? null : onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Poster banner — glows in the event's own color.
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: AppDeco.artGlow(soldOut ? Colors.black : event.tint),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Stack(
                  children: [
                    EventBanner(event: event),
                    // Bright hairline frame.
                    Positioned.fill(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.stroke),
                        ),
                      ),
                    ),
                    if (soldOut)
                      Positioned.fill(
                        child: Container(
                          color: Colors.black.withValues(alpha: 0.50),
                          alignment: Alignment.center,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 13),
                            decoration: BoxDecoration(
                              color: AppColors.bg1,
                              borderRadius: BorderRadius.circular(40),
                              border: Border.all(color: AppColors.strokeHi),
                            ),
                            child: Text(s.soldOutCaps,
                                style: KioskText.label.copyWith(color: AppColors.text, fontSize: 16)),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Info strip
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(event.title,
                            maxLines: 1, overflow: TextOverflow.ellipsis, style: KioskText.title),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.calendar_today_rounded,
                                size: 16, color: AppColors.textMuted),
                            const SizedBox(width: 8),
                            Flexible(
                              child: Text(s.eventWhen(event),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: KioskText.body
                                      .copyWith(fontSize: 16, color: AppColors.textMuted)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),
                  if (soldOut)
                    Text(s.soldOut, style: KioskText.label.copyWith(color: AppColors.danger))
                  else
                    _buyTag(s, event),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buyTag(S s, Event event) {
    return Row(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(s.fromPrice, style: KioskText.label.copyWith(fontSize: 10)),
            const SizedBox(height: 4),
            Text(formatMnt(event.lowestPrice), style: KioskText.price),
          ],
        ),
        const SizedBox(width: 14),
        // Gradient "go" chip.
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: AppColors.brand,
            boxShadow: [
              BoxShadow(
                color: AppColors.magenta.withValues(alpha: 0.45),
                blurRadius: 18,
                spreadRadius: -2,
              ),
            ],
          ),
          child: const Icon(Icons.arrow_forward_rounded, size: 26, color: AppColors.onAccent),
        ),
      ],
    );
  }
}
