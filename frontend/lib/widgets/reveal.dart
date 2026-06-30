import 'package:flutter/material.dart';

/// Fade + slide-up entrance, optionally staggered by [delay]. Used to give the
/// landing feed a lively "lights up" reveal.
class Reveal extends StatefulWidget {
  final Widget child;
  final Duration delay;
  final double offsetY;
  const Reveal({super.key, required this.child, this.delay = Duration.zero, this.offsetY = 28});

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 620),
  );
  late final Animation<double> _a = CurvedAnimation(parent: _c, curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    if (widget.delay == Duration.zero) {
      _c.forward();
    } else {
      Future.delayed(widget.delay, () {
        if (mounted) _c.forward();
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _a,
      builder: (context, child) => Opacity(
        opacity: _a.value,
        child: Transform.translate(offset: Offset(0, widget.offsetY * (1 - _a.value)), child: child),
      ),
      child: widget.child,
    );
  }
}
