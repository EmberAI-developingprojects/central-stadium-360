import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'mascot.dart';

/// The home "host" character (Khulan). She fills the column width and is cropped
/// at the bottom by her frame — standing large with her head at the top and her
/// legs cut off around the knee (like standing behind a counter), reaching the
/// bottom of the screen so there is no gap beneath her.
///
/// Primary: a looping transparent video (`host.webm`, VP9 + alpha) that
/// composites over the dark background. While it loads — or on any platform that
/// can't decode it — she gracefully falls back to a procedurally-animated
/// `host.png`, which itself falls back to the hand-drawn [Mascot].
class HeroCharacter extends StatefulWidget {
  const HeroCharacter({super.key});

  @override
  State<HeroCharacter> createState() => _HeroCharacterState();
}

class _HeroCharacterState extends State<HeroCharacter> {
  late final VideoPlayerController _controller;
  bool _ready = false;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('assets/character/host.webm');
    _controller.initialize().then((_) {
      _controller
        ..setLooping(true)
        ..setVolume(0)
        ..play();
      if (mounted) setState(() => _ready = true);
    }).catchError((_) {
      if (mounted) setState(() => _failed = true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Show the video once it's ready; otherwise the procedural host stands in.
    final showVideo = _ready && !_failed;
    final child = showVideo
        ? _CroppedFill(
            // Use the clip's own aspect (cropped tight to the character) so she
            // fills the column width and is cropped at the knee, like the PNG.
            aspect: _controller.value.aspectRatio,
            child: VideoPlayer(_controller),
          )
        : const _ProceduralHost();
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 400),
      child: KeyedSubtree(
        key: ValueKey(showVideo),
        child: child,
      ),
    );
  }
}

/// Fills the available width at [aspect] (width / height), aligns to the top and
/// clips the overflow at the bottom — so the character's head stays put and her
/// legs are cropped wherever the frame ends.
class _CroppedFill extends StatelessWidget {
  final double aspect;
  final Widget child;
  const _CroppedFill({required this.aspect, required this.child});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final w = c.maxWidth;
        final h = w / aspect; // full height if scaled to fill width
        return ClipRect(
          child: OverflowBox(
            minWidth: w,
            maxWidth: w,
            minHeight: h,
            maxHeight: h,
            alignment: Alignment.topCenter,
            child: SizedBox(width: w, height: h, child: child),
          ),
        );
      },
    );
  }
}

/// Procedural idle on the static `host.png`: a slow "breathing" scale, a gentle
/// vertical bob and a tiny sway, kept inside [_overscale] so the crop never
/// exposes a gap. Used while the video loads or if it can't play.
class _ProceduralHost extends StatefulWidget {
  const _ProceduralHost();

  // Intrinsic size of the tight-cropped host.png (width / height).
  static const double _imgW = 422;
  static const double _imgH = 1241;

  // Base zoom giving a small overflow margin so the bob/sway never show a gap.
  static const double _overscale = 1.03;

  @override
  State<_ProceduralHost> createState() => _ProceduralHostState();
}

class _ProceduralHostState extends State<_ProceduralHost>
    with SingleTickerProviderStateMixin {
  late final AnimationController _idle = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 5),
  )..repeat();

  @override
  void dispose() {
    _idle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final image = Image.asset(
      'assets/character/host.png',
      fit: BoxFit.fill,
      filterQuality: FilterQuality.high,
      errorBuilder: (_, __, ___) => const FittedBox(
        fit: BoxFit.contain,
        child: Mascot(size: 460, mood: MascotMood.wave),
      ),
    );
    return _CroppedFill(
      aspect: _ProceduralHost._imgW / _ProceduralHost._imgH,
      child: AnimatedBuilder(
        animation: _idle,
        builder: (context, child) {
          final t = _idle.value * 2 * math.pi;
          final breathe = (1 - math.cos(t)) / 2; // 0..1, eased
          final scale = _ProceduralHost._overscale + 0.015 * breathe;
          final bob = math.sin(t) * 3.0; // ±3px
          final sway = math.sin(t + math.pi / 3) * 0.004; // ~0.23°
          final m = Matrix4.identity()
            ..translateByDouble(0.0, bob, 0.0, 1.0)
            ..rotateZ(sway)
            ..scaleByDouble(scale, scale, 1.0, 1.0);
          return Transform(
            transform: m,
            alignment: Alignment.center,
            child: child,
          );
        },
        child: image,
      ),
    );
  }
}
