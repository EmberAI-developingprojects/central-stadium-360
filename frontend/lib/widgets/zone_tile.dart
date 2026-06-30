import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../models/zone.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import '../theme/formatting.dart';

/// Selectable pricing-zone row. Zones are capacity counters (no seats).
class ZoneTile extends StatelessWidget {
  final Zone zone;
  final bool selected;
  final VoidCallback onTap;
  const ZoneTile({super.key, required this.zone, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final lang = context.lang;
    final disabled = zone.soldOut;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      decoration: AppDeco.glass(
        radius: 18,
        selected: selected,
        glow: selected ? AppColors.magenta : null,
        glowOpacity: 0.3,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: disabled ? null : onTap,
          child: Opacity(
            opacity: disabled ? 0.45 : 1,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 22, 24, 22),
              child: Row(
                children: [
                  _radio(),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(zone.name(lang), style: KioskText.title),
                        const SizedBox(height: 6),
                        Text(zone.desc(lang),
                            style: KioskText.body.copyWith(fontSize: 17, color: AppColors.textSoft)),
                        const SizedBox(height: 12),
                        _availability(context),
                      ],
                    ),
                  ),
                  const SizedBox(width: 20),
                  Text(formatMnt(zone.price), style: KioskText.price),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _radio() {
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: selected ? AppColors.brand : null,
        color: selected ? null : Colors.transparent,
        border: Border.all(
          color: selected ? Colors.transparent : AppColors.strokeHi,
          width: 1.6,
        ),
        boxShadow: selected
            ? [BoxShadow(color: AppColors.magenta.withValues(alpha: 0.5), blurRadius: 12, spreadRadius: -1)]
            : null,
      ),
      child: selected ? const Icon(Icons.check_rounded, size: 18, color: AppColors.onAccent) : null,
    );
  }

  Widget _availability(BuildContext context) {
    final s = S.of(context);
    if (zone.soldOut) {
      return Text(s.soldOut, style: KioskText.label.copyWith(color: AppColors.danger));
    }
    final low = zone.availabilityFraction < 0.15;
    final fillColor = low ? AppColors.danger : AppColors.cyan;
    return Row(
      children: [
        SizedBox(
          width: 150,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: Stack(
              children: [
                Container(height: 6, color: AppColors.glassHi),
                FractionallySizedBox(
                  widthFactor: (1 - zone.availabilityFraction).clamp(0.02, 1.0),
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      color: fillColor,
                      boxShadow: [BoxShadow(color: fillColor.withValues(alpha: 0.6), blurRadius: 8)],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 14),
        Text(
          low ? s.onlyNLeft(zone.available) : s.nAvailable(zone.available),
          style: KioskText.body.copyWith(
            fontSize: 15,
            color: low ? AppColors.danger : AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}
