import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Compact header chip showing the current local time (HH:mm), ticking live.
class ClockChip extends StatefulWidget {
  const ClockChip({super.key});

  @override
  State<ClockChip> createState() => _ClockChipState();
}

class _ClockChipState extends State<ClockChip> {
  DateTime _now = DateTime.now();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hh = _now.hour.toString().padLeft(2, '0');
    final mm = _now.minute.toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.fromLTRB(11, 9, 18, 9),
      decoration: BoxDecoration(
        color: AppColors.glass,
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppColors.stroke),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [AppColors.magenta.withValues(alpha: 0.16), AppColors.magenta.withValues(alpha: 0.05)],
              ),
              border: Border.all(color: AppColors.magenta.withValues(alpha: 0.32)),
            ),
            child: const Icon(Icons.schedule_rounded, size: 20, color: AppColors.magenta),
          ),
          const SizedBox(width: 10),
          Text('$hh:$mm',
              style: KioskText.title.copyWith(
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
        ],
      ),
    );
  }
}
