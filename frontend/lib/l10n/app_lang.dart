import 'package:flutter/material.dart';

/// Supported languages. Mongolian is the default for the venue.
enum Lang { mn, en }

/// Holds the current language and lets any widget toggle it. Lightweight,
/// dependency-free alternative to full `flutter_localizations` for the
/// prototype. Toggling rebuilds only widgets that depend on [LangScope].
class AppLang extends StatefulWidget {
  final Widget child;
  const AppLang({super.key, required this.child});

  static _AppLangState _of(BuildContext context) =>
      context.findAncestorStateOfType<_AppLangState>()!;

  /// Flip MN <-> EN from anywhere (e.g. the top-bar toggle).
  static void toggle(BuildContext context) => _of(context)._toggle();

  @override
  State<AppLang> createState() => _AppLangState();
}

class _AppLangState extends State<AppLang> {
  Lang _lang = Lang.mn;

  void _toggle() => setState(() => _lang = _lang == Lang.mn ? Lang.en : Lang.mn);

  @override
  Widget build(BuildContext context) {
    return LangScope(lang: _lang, child: widget.child);
  }
}

/// Inherited handle exposing the current [Lang].
class LangScope extends InheritedWidget {
  final Lang lang;
  const LangScope({super.key, required this.lang, required super.child});

  static Lang of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<LangScope>();
    return scope?.lang ?? Lang.mn;
  }

  @override
  bool updateShouldNotify(LangScope old) => old.lang != lang;
}

/// Convenience: `context.lang`.
extension LangContext on BuildContext {
  Lang get lang => LangScope.of(this);
}
