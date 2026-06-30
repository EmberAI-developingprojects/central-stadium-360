import 'package:flutter/material.dart';
import '../l10n/app_lang.dart';
import '../l10n/strings.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'clock_chip.dart';
import 'glow_background.dart';
import 'weather_chip.dart';

/// Shared chrome for kiosk screens: a calm paper backdrop, an optional
/// full-width [banner] band at the very top, then a slim bar with the brand
/// logo, weather and clock on the left and the language toggle on the right.
class KioskScaffold extends StatelessWidget {
  final Widget child;
  final bool showBack;
  final VoidCallback? onBack;

  /// Optional full-width band rendered above the top bar (e.g. the home hero).
  final Widget? banner;

  const KioskScaffold({
    super.key,
    required this.child,
    this.showBack = false,
    this.onBack,
    this.banner,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg0,
      body: Stack(
        children: [
          const GlowBackground(),
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (banner != null) banner!,
                _TopBar(showBack: showBack, onBack: onBack),
                const Divider(height: 1, thickness: 1, color: AppColors.stroke),
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  final bool showBack;
  final VoidCallback? onBack;
  const _TopBar({required this.showBack, this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(44, 22, 44, 18),
      child: Row(
        children: [
          if (showBack) ...[
            _BackButton(onTap: onBack ?? () => Navigator.of(context).maybePop()),
            const SizedBox(width: 22),
          ],
          // Brand logo (Төв Цэнгэлдэх Хүрээлэн) — dark mark for the light paper.
          Image.asset(
            'assets/brand/logo.png',
            height: 62,
            filterQuality: FilterQuality.high,
            errorBuilder: (_, __, ___) => Image.asset('assets/brand/logo_white.png', height: 62),
          ),
          const SizedBox(width: 20),
          const WeatherChip(),
          const SizedBox(width: 12),
          const ClockChip(),
          const Spacer(),
          const _LangToggle(),
        ],
      ),
    );
  }
}

class _LangToggle extends StatelessWidget {
  const _LangToggle();
  @override
  Widget build(BuildContext context) {
    final mn = context.lang == Lang.mn;
    return Material(
      color: AppColors.glass,
      borderRadius: BorderRadius.circular(30),
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
        onTap: () => AppLang.toggle(context),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: AppColors.stroke),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
          child: Row(
            children: [
              Text('MN',
                  style: KioskText.label.copyWith(
                      color: mn ? AppColors.text : AppColors.textMuted, fontSize: 15, letterSpacing: 1)),
              Text('  /  ', style: KioskText.label.copyWith(fontSize: 15, letterSpacing: 1)),
              Text('EN',
                  style: KioskText.label.copyWith(
                      color: mn ? AppColors.textMuted : AppColors.text, fontSize: 15, letterSpacing: 1)),
            ],
          ),
        ),
      ),
    );
  }
}

class _BackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _BackButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glass,
      borderRadius: BorderRadius.circular(30),
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: AppColors.stroke),
          ),
          padding: const EdgeInsets.fromLTRB(18, 12, 24, 12),
          child: Row(
            children: [
              const Icon(Icons.arrow_back_rounded, color: AppColors.text, size: 24),
              const SizedBox(width: 10),
              Text(S.of(context).back, style: KioskText.title.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Primary action — a calm, solid terracotta pill with a soft shadow.
class PrimaryButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool expand;

  const PrimaryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.expand = false,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final content = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 23),
      child: Row(
        mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label,
              style: TextStyle(
                  fontFamily: 'Manrope',
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                  color: enabled ? AppColors.onAccent : AppColors.textMuted)),
          if (icon != null) ...[
            const SizedBox(width: 14),
            Icon(icon, color: enabled ? AppColors.onAccent : AppColors.textMuted, size: 24),
          ],
        ],
      ),
    );

    if (!enabled) {
      return Container(
        decoration: BoxDecoration(
          color: AppColors.glassHi,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.stroke),
        ),
        child: content,
      );
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: AppColors.magenta,
        boxShadow: [
          BoxShadow(
            color: AppColors.magenta.withValues(alpha: 0.32),
            blurRadius: 22,
            spreadRadius: -6,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onPressed,
          child: content,
        ),
      ),
    );
  }
}

/// Secondary action — a frosted-glass pill with a bright hairline.
class GhostButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  const GhostButton({super.key, required this.label, this.icon, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.glass,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onPressed,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.strokeHi, width: 1.4),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 34, vertical: 21),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, color: AppColors.text, size: 24),
                const SizedBox(width: 12),
              ],
              Text(label, style: KioskText.title.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}
