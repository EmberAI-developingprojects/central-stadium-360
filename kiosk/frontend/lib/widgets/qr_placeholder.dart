import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// PLACEHOLDER QR renderer.
///
/// Draws a deterministic QR-like pattern from a seed string so the screens
/// look right without a QR dependency. Replace with `qr_flutter`'s
/// `QrImageView(data: ...)` (or a server-rendered image) for a scannable code.
class QrPlaceholder extends StatelessWidget {
  final String data;
  final double size;
  final Color foreground;
  final Color background;

  const QrPlaceholder({
    super.key,
    required this.data,
    this.size = 280,
    this.foreground = const Color(0xFF1C1B17),
    this.background = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    // Gradient frame + neon glow around a bright (scannable) QR card.
    return Container(
      padding: EdgeInsets.all(size * 0.035),
      decoration: BoxDecoration(
        gradient: AppColors.brand,
        borderRadius: BorderRadius.circular(size * 0.10),
        boxShadow: [
          BoxShadow(
            color: AppColors.magenta.withValues(alpha: 0.4),
            blurRadius: 30,
            spreadRadius: -4,
          ),
        ],
      ),
      child: Container(
        width: size,
        height: size,
        padding: EdgeInsets.all(size * 0.08),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(size * 0.07),
        ),
        child: CustomPaint(painter: _QrPainter(data, foreground)),
      ),
    );
  }
}

class _QrPainter extends CustomPainter {
  final String data;
  final Color fg;
  _QrPainter(this.data, this.fg);

  @override
  void paint(Canvas canvas, Size size) {
    const n = 25; // modules per side
    final cell = size.width / n;
    final paint = Paint()..color = fg;

    // Deterministic pseudo-random fill from the data string.
    int hash = 0;
    for (final c in data.codeUnits) {
      hash = (hash * 31 + c) & 0x7fffffff;
    }
    int rng = hash == 0 ? 1 : hash;
    int next() {
      rng = (rng * 1103515245 + 12345) & 0x7fffffff;
      return rng;
    }

    bool isFinder(int x, int y) {
      bool inBox(int ox, int oy) =>
          x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
      return inBox(0, 0) || inBox(n - 7, 0) || inBox(0, n - 7);
    }

    for (int y = 0; y < n; y++) {
      for (int x = 0; x < n; x++) {
        if (isFinder(x, y)) continue;
        if (next() % 100 < 48) {
          canvas.drawRect(
            Rect.fromLTWH(x * cell, y * cell, cell * 0.92, cell * 0.92),
            paint,
          );
        }
      }
    }

    // Finder squares (the three corners).
    void finder(int ox, int oy) {
      canvas.drawRect(Rect.fromLTWH(ox * cell, oy * cell, cell * 7, cell * 7), paint);
      canvas.drawRect(
        Rect.fromLTWH((ox + 1) * cell, (oy + 1) * cell, cell * 5, cell * 5),
        Paint()..color = Colors.white,
      );
      canvas.drawRect(
        Rect.fromLTWH((ox + 2) * cell, (oy + 2) * cell, cell * 3, cell * 3),
        paint,
      );
    }

    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);
  }

  @override
  bool shouldRepaint(covariant _QrPainter old) => old.data != data || old.fg != fg;
}
