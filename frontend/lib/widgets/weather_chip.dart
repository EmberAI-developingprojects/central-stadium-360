import 'package:flutter/material.dart';
import '../services/weather.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';

/// Compact header chip showing live Ulaanbaatar weather (condition icon + temp).
/// Fetches once on mount and renders nothing if the network is unavailable.
class WeatherChip extends StatefulWidget {
  const WeatherChip({super.key});

  @override
  State<WeatherChip> createState() => _WeatherChipState();
}

class _WeatherChipState extends State<WeatherChip> {
  Weather? _weather;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    WeatherService.fetchUlaanbaatar().then((w) {
      if (!mounted) return;
      setState(() {
        _weather = w;
        _loaded = true;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final w = _weather;
    // Nothing yet, or fetch failed -> take no space.
    if (!_loaded || w == null) return const SizedBox.shrink();

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
                colors: [w.tint.withValues(alpha: 0.30), w.tint.withValues(alpha: 0.10)],
              ),
              border: Border.all(color: w.tint.withValues(alpha: 0.45)),
            ),
            child: Icon(w.icon, size: 20, color: w.tint),
          ),
          const SizedBox(width: 10),
          Text('${w.tempC}°',
              style: KioskText.title.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}
