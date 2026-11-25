import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stadium_kiosk/app.dart';

void main() {
  testWidgets('Home screen shows the welcome and primary action (MN default)', (tester) async {
    await tester.pumpWidget(const StadiumKioskApp());
    await tester.pump(); // first frame
    await tester.pump(const Duration(milliseconds: 500)); // fire staggered reveals

    // Boots through EventsScope (offline → bundled catalog) without crashing,
    // and the home hero shows the MN welcome + the "Buy tickets" action.
    expect(find.text('Тавтай морилно уу'), findsOneWidget); // "Welcome" (MN)
    expect(find.text('Тасалбар авах'), findsOneWidget); // "Buy tickets" (MN)

    // Dispose the tree so the banner slideshow / reveal timers are cancelled
    // (otherwise the test fails on pending timers).
    await tester.pumpWidget(const SizedBox());
  });
}
