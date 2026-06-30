// Renders each screen to a PNG for visual review.
// Run with: flutter test --update-goldens test/screens_capture_test.dart
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stadium_kiosk/data/events_scope.dart';
import 'package:stadium_kiosk/data/mock_events.dart';
import 'package:stadium_kiosk/models/ticket_order.dart';
import 'package:stadium_kiosk/screens/confirmation_screen.dart';
import 'package:stadium_kiosk/screens/event_detail_screen.dart';
import 'package:stadium_kiosk/screens/home_screen.dart';
import 'package:stadium_kiosk/screens/payment_screen.dart';
import 'package:stadium_kiosk/theme/app_theme.dart';
import 'package:stadium_kiosk/widgets/kiosk_canvas.dart';

Widget _wrap(Widget screen) => EventsScope(
      // Offline in tests (no KIOSK_API_BASE) → resolves to the bundled catalog.
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: AppTheme.light,
        builder: (context, child) => KioskCanvas(child: child ?? const SizedBox()),
        home: screen,
      ),
    );

Future<void> _shoot(WidgetTester tester, Widget screen, String name) async {
  tester.view.physicalSize = const Size(1080, 1920);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(_wrap(screen));
  // Load the real banner assets so they paint in the golden.
  await tester.runAsync(() async {
    final ctx = tester.element(find.byType(KioskCanvas));
    await precacheImage(const AssetImage('assets/brand/logo.png'), ctx);
    await precacheImage(const AssetImage('assets/brand/stadium_blur.jpg'), ctx);
    await precacheImage(const AssetImage('assets/character/host.png'), ctx);
    for (final e in kMockEvents) {
      await precacheImage(AssetImage(e.image), ctx);
    }
  });
  // Staggered Reveal entrances use Future.delayed then a 620ms animation.
  // Pump in stages: first fire the delays, then advance the animations to
  // completion (a single big pump leaves opacity at 0 / timers pending).
  await tester.pump(); // initial frame
  await tester.pump(const Duration(milliseconds: 500)); // fire staggered delays
  await tester.pump(const Duration(milliseconds: 700)); // finish entrance anims
  await tester.pump(const Duration(milliseconds: 100));
  await expectLater(find.byType(KioskCanvas), matchesGoldenFile('goldens/screen_$name.png'));
  await tester.pumpWidget(const SizedBox()); // dispose tickers
}

// flutter_test doesn't bundle pubspec fonts, so text renders as tofu boxes.
// Load the real font files from disk so the captured PNGs show real glyphs
// (Cyrillic / Mongolian) exactly as the running app does.
Future<void> _loadRealFonts() async {
  const fonts = {
    'YU Buyan Bold': 'assets/fonts/YubuyanBold.ttf',
    'Manrope': 'assets/fonts/Manrope.ttf',
  };
  for (final entry in fonts.entries) {
    final bytes = File(entry.value).readAsBytesSync();
    final loader = FontLoader(entry.key)
      ..addFont(Future.value(ByteData.view(bytes.buffer)));
    await loader.load();
  }
}

void main() {
  setUpAll(_loadRealFonts);

  final order = TicketOrder(
    event: kMockEvents[0],
    zone: kMockEvents[0].zones[1],
    quantity: 2,
    reference: 'NS-THEHU-Z_PREMIUM-4321',
  );

  testWidgets('home', (t) => _shoot(t, const HomeScreen(), 'home'));
  testWidgets('detail', (t) => _shoot(t, EventDetailScreen(event: kMockEvents[0]), 'detail'));
  testWidgets('payment', (t) => _shoot(t, PaymentScreen(order: order), 'payment'));
  testWidgets('confirm', (t) => _shoot(t, ConfirmationScreen(order: order), 'confirm'));
}
