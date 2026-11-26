import 'dart:async';
import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../models/event.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/formatting.dart';

/// Full-width "Upcoming events" hero banner: one event at a time, its artwork
/// filling the frame with the title / date / price set inside, auto-advancing
/// as a slideshow with page dots. Tapping a slide opens that event.
class UpcomingBanner extends StatefulWidget {
  final List<Event> events;
  final void Function(Event event) onOpen;
  final double height;
  final double radius;
  final Duration interval;

  const UpcomingBanner({
    super.key,
    required this.events,
    required this.onOpen,
    this.height = 340,
    this.radius = 28,
    this.interval = const Duration(seconds: 5),
  });

  @override
  State<UpcomingBanner> createState() => _UpcomingBannerState();
}

class _UpcomingBannerState extends State<UpcomingBanner> {
  final _controller = PageController();
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _arm();
  }

  void _arm() {
    _timer?.cancel();
    if (widget.events.length < 2) return;
    _timer = Timer.periodic(widget.interval, (_) => _advance());
  }

  void _advance() {
    if (!mounted) return;
    final next = (_index + 1) % widget.events.length;
    _controller.animateToPage(
      next,
      duration: const Duration(milliseconds: 520),
      curve: Curves.easeInOutCubic,
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(widget.radius),
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.events.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (_, i) => _Slide(event: widget.events[i], onTap: () => widget.onOpen(widget.events[i])),
            ),
          ),
          // Section tag (fixed) — top-left
          Positioned(top: 22, left: 24, child: _tag(context)),
          // Page dots (fixed) — top-right, backed for contrast over artwork
          if (widget.events.length > 1)
            Positioned(
              top: 24,
              right: 24,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.40),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                ),
                child: Row(
                  children: List.generate(widget.events.length, (i) => _dot(i == _index)),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _tag(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.40),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.local_fire_department_rounded, color: AppColors.gold, size: 18),
          const SizedBox(width: 8),
          Text(S.of(context).upcomingTag,
              style: KioskText.label.copyWith(color: AppColors.gold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _dot(bool active) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      margin: const EdgeInsets.only(left: 7),
      width: active ? 26 : 8,
      height: 8,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        gradient: active ? AppColors.brand : null,
        color: active ? null : Colors.white.withValues(alpha: 0.45),
      ),
    );
  }
}

class _Slide extends StatelessWidget {
  final Event event;
  final VoidCallback onTap;
  const _Slide({required this.event, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final lang = context.lang;
    final soldOut = !event.anyAvailable;

    return GestureDetector(
      onTap: soldOut ? null : onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Full-bleed artwork
          event.buildCover(
            fit: BoxFit.cover,
            alignment: Alignment.topCenter,
            errorBuilder: (_, __, ___) => DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [event.tint.withValues(alpha: 0.5), event.tint.withValues(alpha: 0.15)],
                ),
              ),
              child: Center(child: Icon(event.icon, size: 90, color: Colors.white70)),
            ),
          ),
          // Readability scrim — darker on the left/bottom where the text sits.
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomLeft,
                end: Alignment.topRight,
                colors: [Color(0xE60B0B1A), Color(0x660B0B1A), Color(0x000B0B1A)],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),
          // Text block — bottom-left, inside the banner.
          Padding(
            padding: const EdgeInsets.fromLTRB(30, 24, 30, 22),
            child: Align(
              alignment: Alignment.bottomLeft,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.subtitle(lang).toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: KioskText.label.copyWith(color: AppColors.gold, fontSize: 13)),
                  const SizedBox(height: 8),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 640),
                    child: Text(event.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: KioskText.display.copyWith(fontSize: 38, height: 1.02, color: Colors.white)),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_rounded, size: 16, color: Colors.white.withValues(alpha: 0.85)),
                      const SizedBox(width: 8),
                      Text(s.eventWhen(event),
                          style: KioskText.body.copyWith(fontSize: 16, color: Colors.white.withValues(alpha: 0.85))),
                      const SizedBox(width: 22),
                      if (soldOut)
                        Text(s.soldOutCaps,
                            style: KioskText.label.copyWith(color: AppColors.danger, fontSize: 13))
                      else ...[
                        Text(s.fromPrice,
                            style: KioskText.label.copyWith(fontSize: 10, color: Colors.white.withValues(alpha: 0.75))),
                        const SizedBox(width: 8),
                        Text(formatMnt(event.lowestPrice),
                            style: KioskText.price.copyWith(fontSize: 22, color: Colors.white)),
                        const Spacer(),
                        _goChip(),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _goChip() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(
        gradient: AppColors.brand,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(color: AppColors.magenta.withValues(alpha: 0.4), blurRadius: 18, spreadRadius: -2),
        ],
      ),
      child: const Icon(Icons.arrow_forward_rounded, size: 24, color: AppColors.onAccent),
    );
  }
}
