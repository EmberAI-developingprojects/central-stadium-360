// Utility "test" that renders the mascot to PNG files so we can eyeball it.
// Run with:  flutter test --update-goldens test/mascot_capture_test.dart
// Produces test/goldens/mascot_<mood>.png
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stadium_kiosk/widgets/mascot.dart';

void main() {
  for (final mood in MascotMood.values) {
    testWidgets('capture ${mood.name}', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(
            backgroundColor: const Color(0xFF1B1033),
            body: Center(
              child: SizedBox(
                width: 480,
                height: 480,
                child: Mascot(size: 460, mood: mood),
              ),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 250));
      await expectLater(
        find.byType(Mascot),
        matchesGoldenFile('goldens/mascot_${mood.name}.png'),
      );
      // Dispose tickers before the test ends.
      await tester.pumpWidget(const SizedBox());
    });
  }
}
