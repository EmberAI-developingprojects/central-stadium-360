import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Renders the whole app on a fixed **1920×1080 design surface** and scales it
/// to fit the actual window (letterboxing the remainder).
///
/// The kiosk targets a 47" 1080×1920 **portrait** panel, so the UI is authored
/// at that exact size. On a laptop/browser this scales down uniformly — true
/// kiosk proportions, and no RenderFlex overflow from a too-small window.
class KioskCanvas extends StatelessWidget {
  final Widget child;
  // Portrait 47" panel.
  static const double designWidth = 1080;
  static const double designHeight = 1920;

  const KioskCanvas({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.paper,
      child: Center(
        child: AspectRatio(
          aspectRatio: designWidth / designHeight,
          child: FittedBox(
            fit: BoxFit.contain,
            child: SizedBox(
              width: designWidth,
              height: designHeight,
              child: child,
            ),
          ),
        ),
      ),
    );
  }
}
