import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Background: a heavily-blurred photo of the National Stadium under a soft
/// greige veil, so it reads as a calm textured backdrop while the white cards
/// and ink text stay perfectly legible.
class GlowBackground extends StatelessWidget {
  const GlowBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/brand/stadium_blur.jpg',
            fit: BoxFit.cover,
            alignment: Alignment.center,
            errorBuilder: (_, __, ___) =>
                const DecoratedBox(decoration: BoxDecoration(color: AppColors.bg0)),
          ),
          // Greige veil — keeps content readable; a touch heavier at the edges.
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.bg0.withValues(alpha: 0.46),
                  AppColors.bg0.withValues(alpha: 0.38),
                  AppColors.bg0.withValues(alpha: 0.54),
                ],
                stops: const [0.0, 0.5, 1.0],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
