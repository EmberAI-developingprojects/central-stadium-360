import 'package:flutter/material.dart';
import '../models/event.dart';

/// The event banner artwork (1920×648), shown at its native aspect ratio with
/// a soft bottom gradient so the poster melts into the dark stage. Falls back
/// to a tinted block with the event's line icon if the asset can't load.
class EventBanner extends StatelessWidget {
  final Event event;
  const EventBanner({super.key, required this.event});

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1920 / 648,
      child: Stack(
        fit: StackFit.expand,
        children: [
          event.buildCover(
            fit: BoxFit.cover,
            errorBuilder: (context, error, stack) => DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    event.tint.withValues(alpha: 0.42),
                    event.tint.withValues(alpha: 0.14),
                  ],
                ),
              ),
              child: Center(child: Icon(event.icon, size: 72, color: Colors.white70)),
            ),
          ),
          // Gentle bottom-to-top scrim to seat the poster on the dark UI.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.center,
                colors: [Color(0x55000000), Color(0x00000000)],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
