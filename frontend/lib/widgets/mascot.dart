import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Mascot moods — mirrors the planned Rive state machine
/// (idle / wave / celebrate-on-purchase).
enum MascotMood { idle, wave, celebrate }

/// PLACEHOLDER mascot.
///
/// The brief calls for a 2D animated woman built in **Rive** (idle + a few
/// triggered reactions). This is a dependency-free stand-in drawn with a
/// CustomPainter and a gentle idle animation so the layout and "alive" feel
/// are right. Swap this whole widget for a `RiveAnimation.asset(...)` driving
/// a state machine once the rig exists.
class Mascot extends StatefulWidget {
  final double size;
  final MascotMood mood;
  const Mascot({super.key, this.size = 360, this.mood = MascotMood.idle});

  @override
  State<Mascot> createState() => _MascotState();
}

class _MascotState extends State<Mascot> with TickerProviderStateMixin {
  late final AnimationController _idle = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 3),
  )..repeat(reverse: true);

  late final AnimationController _gesture = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  );

  @override
  void initState() {
    super.initState();
    _maybePlayGesture();
  }

  @override
  void didUpdateWidget(covariant Mascot old) {
    super.didUpdateWidget(old);
    if (old.mood != widget.mood) _maybePlayGesture();
  }

  void _maybePlayGesture() {
    if (widget.mood == MascotMood.idle) {
      _gesture.stop();
      return;
    }
    if (widget.mood == MascotMood.celebrate) {
      _gesture.repeat();
    } else {
      _gesture.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _idle.dispose();
    _gesture.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_idle, _gesture]),
      builder: (context, _) {
        final bob = math.sin(_idle.value * math.pi * 2) * 6;
        return SizedBox(
          width: widget.size,
          height: widget.size,
          child: Transform.translate(
            offset: Offset(0, bob),
            child: CustomPaint(
              painter: _MascotPainter(
                mood: widget.mood,
                gesture: _gesture.value,
                idle: _idle.value,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _MascotPainter extends CustomPainter {
  final MascotMood mood;
  final double gesture; // 0..1
  final double idle; // 0..1
  _MascotPainter({required this.mood, required this.gesture, required this.idle});

  // Palette — soft, girly & cute
  static const _skin = Color(0xFFFFE2D1);
  static const _skinShade = Color(0xFFF7C6AE);
  static const _hair = Color(0xFF7A5648); // warm caramel brown
  static const _hairDark = Color(0xFF5E4034);
  static const _hairHi = Color(0xFF9C7461); // hair highlight
  static const _cloth = Color(0xFFF2A7B8); // pastel pink top
  static const _clothShade = Color(0xFFE88FA4);
  static const _bow = Color(0xFFEF7E9B); // candy-pink bow
  static const _bowDark = Color(0xFFE0628A);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    final cx = w / 2;

    final headC = Offset(cx, h * 0.215);
    final headR = w * 0.155;
    final shoulderY = h * 0.44;
    final hemY = h * 0.66;
    final celebrating = mood == MascotMood.celebrate;

    // ---- Soft pink glow halo --------------------------------------------
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [_bow.withValues(alpha: 0.16), Colors.transparent],
      ).createShader(Rect.fromCircle(center: Offset(cx, h * 0.45), radius: w * 0.55));
    canvas.drawCircle(Offset(cx, h * 0.45), w * 0.55, glow);

    // ---- Twin-tail back hair: two soft, rounded pigtails -----------------
    for (final s in [-1.0, 1.0]) {
      final tailC = Offset(headC.dx + s * headR * 1.08, headC.dy + headR * 1.3);
      canvas.drawOval(
        Rect.fromCenter(center: tailC, width: headR * 0.95, height: headR * 2.6),
        Paint()..color = _hair,
      );
      // glossy highlight on each pigtail
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(tailC.dx - s * headR * 0.12, tailC.dy - headR * 0.6),
          width: headR * 0.26,
          height: headR * 1.3,
        ),
        Paint()..color = _hairHi.withValues(alpha: 0.55),
      );
    }

    // ---- Back hair behind the head (frames the face) --------------------
    final backHair = RRect.fromRectAndRadius(
      Rect.fromCenter(
        center: Offset(cx, headC.dy + headR * 0.35),
        width: headR * 2.4,
        height: headR * 2.6,
      ),
      Radius.circular(headR * 1.1),
    );
    canvas.drawRRect(backHair, Paint()..color = _hair);

    // ---- Legs + little mary-jane shoes ----------------------------------
    for (final s in [-1.0, 1.0]) {
      final lx = cx + s * w * 0.055;
      canvas.drawLine(
        Offset(lx, hemY - h * 0.01),
        Offset(lx, h * 0.825),
        Paint()
          ..color = _skin
          ..style = PaintingStyle.stroke
          ..strokeWidth = w * 0.075
          ..strokeCap = StrokeCap.round,
      );
      final shoe = Rect.fromCenter(
          center: Offset(lx, h * 0.845), width: w * 0.12, height: w * 0.07);
      canvas.drawOval(shoe, Paint()..color = _bow);
      canvas.drawOval(
        shoe,
        Paint()
          ..color = _bowDark
          ..style = PaintingStyle.stroke
          ..strokeWidth = w * 0.008,
      );
    }

    // ---- Dress (bell-shaped, pastel pink) -------------------------------
    final dress = Path()
      ..moveTo(cx - w * 0.115, shoulderY)
      ..quadraticBezierTo(cx - w * 0.205, h * 0.58, cx - w * 0.20, hemY)
      ..quadraticBezierTo(cx, hemY + h * 0.035, cx + w * 0.20, hemY)
      ..quadraticBezierTo(cx + w * 0.205, h * 0.58, cx + w * 0.115, shoulderY)
      ..quadraticBezierTo(cx, shoulderY + h * 0.03, cx - w * 0.115, shoulderY)
      ..close();
    canvas.drawPath(dress, Paint()..color = _cloth);
    // hem shade band
    canvas.drawPath(
      Path()
        ..moveTo(cx - w * 0.195, hemY - h * 0.005)
        ..quadraticBezierTo(cx, hemY + h * 0.03, cx + w * 0.195, hemY - h * 0.005),
      Paint()
        ..color = _clothShade
        ..style = PaintingStyle.stroke
        ..strokeWidth = h * 0.018
        ..strokeCap = StrokeCap.round,
    );
    // waist ribbon + little bow
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx, h * 0.515), width: w * 0.20, height: h * 0.022),
        Radius.circular(h * 0.012),
      ),
      Paint()..color = _bow,
    );
    _drawBow(canvas, Offset(cx, h * 0.515), w * 0.05);

    // ---- Resting arm(s) (left always; right too when idle) --------------
    void restArm(double s) {
      final sh = Offset(cx + s * w * 0.115, shoulderY + h * 0.02);
      final hand = Offset(cx + s * w * 0.215, h * 0.585);
      canvas.drawLine(
        sh,
        hand,
        Paint()
          ..color = _skin
          ..style = PaintingStyle.stroke
          ..strokeWidth = w * 0.05
          ..strokeCap = StrokeCap.round,
      );
      canvas.drawCircle(hand, w * 0.04, Paint()..color = _skin);
      canvas.drawCircle(sh, w * 0.045, Paint()..color = _cloth); // shoulder cap
    }

    restArm(-1.0);
    if (mood == MascotMood.idle) restArm(1.0);

    // ---- Neck ------------------------------------------------------------
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(
          center: Offset(cx, headC.dy + headR * 0.92),
          width: headR * 0.56,
          height: headR * 0.7,
        ),
        Radius.circular(headR * 0.22),
      ),
      Paint()..color = _skinShade,
    );

    // ---- Face ------------------------------------------------------------
    canvas.drawCircle(headC, headR, Paint()..color = _skin);

    // Ears
    for (final s in [-1.0, 1.0]) {
      canvas.drawCircle(
        Offset(headC.dx + s * headR * 0.97, headC.dy + headR * 0.14),
        headR * 0.15,
        Paint()..color = _skinShade,
      );
    }

    // ---- Bangs: soft rounded fringe with cute side curls ----------------
    canvas.save();
    canvas.clipPath(Path()..addOval(Rect.fromCircle(center: headC, radius: headR + 1)));
    final leftX = headC.dx - headR * 1.25;
    final rightX = headC.dx + headR * 1.25;
    final bangs = Path()
      ..moveTo(leftX, headC.dy - headR * 1.25)
      ..lineTo(rightX, headC.dy - headR * 1.25)
      ..lineTo(rightX, headC.dy - headR * 0.40)
      // little curved tuft on the right
      ..quadraticBezierTo(
          headC.dx + headR * 0.62, headC.dy - headR * 0.02, headC.dx + headR * 0.30, headC.dy - headR * 0.30)
      // soft middle parting
      ..quadraticBezierTo(
          headC.dx + headR * 0.10, headC.dy - headR * 0.50, headC.dx, headC.dy - headR * 0.30)
      ..quadraticBezierTo(
          headC.dx - headR * 0.10, headC.dy - headR * 0.50, headC.dx - headR * 0.30, headC.dy - headR * 0.30)
      // little curved tuft on the left
      ..quadraticBezierTo(
          headC.dx - headR * 0.62, headC.dy - headR * 0.02, leftX, headC.dy - headR * 0.40)
      ..close();
    canvas.drawPath(bangs, Paint()..color = _hair);
    // glossy sheen across the fringe
    canvas.drawPath(
      Path()
        ..moveTo(headC.dx - headR * 0.55, headC.dy - headR * 0.62)
        ..quadraticBezierTo(headC.dx, headC.dy - headR * 0.78, headC.dx + headR * 0.55, headC.dy - headR * 0.62),
      Paint()
        ..color = _hairHi.withValues(alpha: 0.6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = headR * 0.10
        ..strokeCap = StrokeCap.round,
    );
    canvas.restore();

    // ---- Cute bow on top of the head ------------------------------------
    _drawBow(canvas, Offset(headC.dx + headR * 0.62, headC.dy - headR * 0.92), headR * 0.62);

    // ---- Eyebrows (soft & thin) -----------------------------------------
    final brow = Paint()
      ..color = _hair.withValues(alpha: 0.7)
      ..style = PaintingStyle.stroke
      ..strokeWidth = headR * 0.045
      ..strokeCap = StrokeCap.round;
    for (final s in [-1.0, 1.0]) {
      final bx = headC.dx + s * headR * 0.42;
      final by = headC.dy - headR * 0.26;
      canvas.drawPath(
        Path()
          ..moveTo(bx - headR * 0.13, by)
          ..quadraticBezierTo(bx, by - headR * 0.045, bx + headR * 0.13, by),
        brow,
      );
    }

    // ---- Big sparkly eyes (with lashes, blink + twin highlights) --------
    final blink = (idle > 0.94) ? 0.10 : 1.0;
    for (final s in [-1.0, 1.0]) {
      final e = Offset(headC.dx + s * headR * 0.42, headC.dy + headR * 0.14);
      final eyeW = headR * 0.40;
      final eyeH = headR * 0.54 * blink;
      // white of the eye
      canvas.drawOval(
        Rect.fromCenter(center: e, width: eyeW, height: eyeH),
        Paint()..color = Colors.white,
      );
      if (blink > 0.5) {
        // big rose-brown iris
        canvas.drawOval(
          Rect.fromCenter(center: e, width: eyeW * 0.82, height: headR * 0.46),
          Paint()..color = const Color(0xFF7B4B3A),
        );
        canvas.drawCircle(e, headR * 0.10, Paint()..color = _hairDark);
        // two cute highlights
        canvas.drawCircle(
          Offset(e.dx + headR * 0.07, e.dy - headR * 0.11),
          headR * 0.06,
          Paint()..color = Colors.white,
        );
        canvas.drawCircle(
          Offset(e.dx - headR * 0.05, e.dy + headR * 0.06),
          headR * 0.03,
          Paint()..color = Colors.white.withValues(alpha: 0.8),
        );
      }
      // upper lash line + flick
      final lash = Paint()
        ..color = _hairDark
        ..style = PaintingStyle.stroke
        ..strokeWidth = headR * 0.05
        ..strokeCap = StrokeCap.round;
      canvas.drawPath(
        Path()
          ..moveTo(e.dx - eyeW * 0.55, e.dy - eyeH * 0.30)
          ..quadraticBezierTo(e.dx, e.dy - eyeH * 0.62, e.dx + eyeW * 0.55, e.dy - eyeH * 0.34)
          ..lineTo(e.dx + s * eyeW * 0.62, e.dy - eyeH * 0.62), // outer lash flick
        lash,
      );
    }

    // ---- Blush (rosy & round) -------------------------------------------
    final blush = Paint()..color = const Color(0x59FF8FA8);
    for (final s in [-1.0, 1.0]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset(headC.dx + s * headR * 0.58, headC.dy + headR * 0.44),
          width: headR * 0.36,
          height: headR * 0.24,
        ),
        blush,
      );
    }

    // ---- Sweet smile (wider when celebrating) ---------------------------
    final smileW = celebrating ? 0.34 : 0.22;
    final smile = Paint()
      ..color = const Color(0xFFD06B7E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = headR * 0.08
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(
      Path()
        ..moveTo(headC.dx - headR * smileW, headC.dy + headR * 0.56)
        ..quadraticBezierTo(headC.dx, headC.dy + headR * (celebrating ? 0.86 : 0.72),
            headC.dx + headR * smileW, headC.dy + headR * 0.56),
      smile,
    );

    // ---- Waving arm (wave + celebrate) ----------------------------------
    if (mood != MascotMood.idle) {
      final swing = celebrating
          ? math.sin(gesture * math.pi * 2) * 0.5
          : math.sin(gesture * math.pi * 3) * 0.35;
      final shoulder = Offset(cx + w * 0.115, shoulderY + h * 0.02);
      final elbow = Offset(cx + w * 0.19, h * 0.33);
      final hand = Offset(
        elbow.dx + w * 0.05 + swing * w * 0.05,
        elbow.dy - h * 0.11 * (0.7 + swing.abs()),
      );
      final armPaint = Paint()
        ..color = _skin
        ..style = PaintingStyle.stroke
        ..strokeWidth = w * 0.05
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      canvas.drawPath(
        Path()
          ..moveTo(shoulder.dx, shoulder.dy)
          ..lineTo(elbow.dx, elbow.dy)
          ..lineTo(hand.dx, hand.dy),
        armPaint,
      );
      canvas.drawCircle(shoulder, w * 0.045, Paint()..color = _cloth); // shoulder cap
      canvas.drawCircle(hand, w * 0.045, Paint()..color = _skin); // hand
    }

    // ---- Celebration heart sparkles -------------------------------------
    if (celebrating) {
      const seeds = [0.15, 0.4, 0.7, 0.85, 0.55, 0.3];
      const palette = [_bow, AppColors.gold, _cloth];
      for (int i = 0; i < seeds.length; i++) {
        final a = (gesture + seeds[i]) * math.pi * 2;
        final r = w * (0.34 + 0.10 * math.sin(a));
        final p = Offset(cx + r * math.cos(a + i), headC.dy + r * math.sin(a + i) * 0.7);
        final s = w * 0.030 * (0.6 + 0.4 * math.sin(gesture * 6 + i));
        _drawHeart(canvas, p, s, Paint()..color = palette[i % palette.length]);
      }
    }
  }

  /// A simple symmetric ribbon bow centred at [c].
  void _drawBow(Canvas canvas, Offset c, double r) {
    final fill = Paint()..color = _bow;
    final edge = Paint()
      ..color = _bowDark
      ..style = PaintingStyle.stroke
      ..strokeWidth = r * 0.10
      ..strokeJoin = StrokeJoin.round;
    for (final s in [-1.0, 1.0]) {
      final loop = Path()
        ..moveTo(c.dx, c.dy)
        ..quadraticBezierTo(c.dx + s * r * 1.05, c.dy - r * 0.78, c.dx + s * r * 0.95, c.dy)
        ..quadraticBezierTo(c.dx + s * r * 1.05, c.dy + r * 0.78, c.dx, c.dy)
        ..close();
      canvas.drawPath(loop, fill);
      canvas.drawPath(loop, edge);
    }
    // centre knot
    canvas.drawCircle(c, r * 0.26, fill);
    canvas.drawCircle(c, r * 0.26, edge);
  }

  /// A little heart centred at [c] with half-height [r].
  void _drawHeart(Canvas canvas, Offset c, double r, Paint p) {
    final path = Path()
      ..moveTo(c.dx, c.dy + r * 0.9)
      ..cubicTo(c.dx + r * 1.4, c.dy - r * 0.2, c.dx + r * 0.55, c.dy - r * 1.2, c.dx, c.dy - r * 0.4)
      ..cubicTo(c.dx - r * 0.55, c.dy - r * 1.2, c.dx - r * 1.4, c.dy - r * 0.2, c.dx, c.dy + r * 0.9)
      ..close();
    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _MascotPainter old) =>
      old.gesture != gesture || old.idle != idle || old.mood != mood;
}

/// Speech bubble shown next to the mascot.
class MascotBubble extends StatelessWidget {
  final String text;
  const MascotBubble({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 24, offset: const Offset(0, 8)),
        ],
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600, color: Color(0xFF2D1B4E), height: 1.3),
      ),
    );
  }
}
