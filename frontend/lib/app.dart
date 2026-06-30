import 'package:flutter/material.dart';
import 'data/events_scope.dart';
import 'l10n/app_lang.dart';
import 'screens/home_screen.dart';
import 'theme/app_theme.dart';
import 'widgets/kiosk_canvas.dart';

class StadiumKioskApp extends StatelessWidget {
  const StadiumKioskApp({super.key});

  @override
  Widget build(BuildContext context) {
    return EventsScope(
      child: AppLang(
      child: MaterialApp(
        title: 'Stadium Kiosk',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        // Every route renders on the fixed portrait kiosk canvas, scaled to fit.
        builder: (context, child) => KioskCanvas(child: child ?? const SizedBox()),
        home: const HomeScreen(),
      ),
      ),
    );
  }
}
