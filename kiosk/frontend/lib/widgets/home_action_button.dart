import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';

/// A large touch tile for the home hero's side menu (Buy tickets, etc.).
/// [primary] gives it the vivid gradient + glow treatment.
class HomeActionButton extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool primary;

  const HomeActionButton({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.primary = false,
  });

  @override
  Widget build(BuildContext context) {
    final decoration = primary
        ? BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            color: AppColors.magenta,
            boxShadow: [
              BoxShadow(
                color: AppColors.magenta.withValues(alpha: 0.30),
                blurRadius: 26,
                spreadRadius: -6,
                offset: const Offset(0, 14),
              ),
            ],
          )
        : AppDeco.glass(radius: 22);

    final fg = primary ? AppColors.onAccent : AppColors.text;
    final sub = primary ? AppColors.onAccent.withValues(alpha: 0.72) : AppColors.textMuted;
    final iconBg = primary ? AppColors.onAccent.withValues(alpha: 0.12) : AppColors.glassHi;

    return DecoratedBox(
      decoration: decoration,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(22),
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 26, 24, 26),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, size: 32, color: fg),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: KioskText.h2.copyWith(color: fg)),
                      const SizedBox(height: 4),
                      Text(subtitle, style: KioskText.body.copyWith(fontSize: 16, color: sub)),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Icon(Icons.arrow_forward_rounded, size: 26, color: fg),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
