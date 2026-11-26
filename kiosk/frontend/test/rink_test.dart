import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:stadium_kiosk/l10n/app_lang.dart';
import 'package:stadium_kiosk/l10n/strings.dart';
import 'package:stadium_kiosk/models/event.dart';
import 'package:stadium_kiosk/models/ticket_order.dart';
import 'package:stadium_kiosk/screens/rink_phone_screen.dart';

Map<String, dynamic> _json({String? kind, int? duration}) => {
      'id': 'e1',
      'title': 'Мөсөн гулгуур',
      'description': null,
      'status': 'upcoming',
      'start_time': '2026-11-26T02:00:00Z',
      'image': null,
      'thumbnail_url': null,
      if (kind != null) 'kind': kind,
      if (duration != null) 'rink_duration_minutes': duration,
      'zones': [
        {
          'id': 'z38',
          'name_mn': '38',
          'name_en': 'Size 38',
          'price': 15000,
          'capacity': 6,
          'sold': 2,
          'sort_order': 0,
        },
      ],
    };

void main() {
  group('Event.fromJson', () {
    test('reads a rink and its duration', () {
      final e = Event.fromJson(_json(kind: 'rink', duration: 120));
      expect(e.isRink, isTrue);
      expect(e.rinkDurationMinutes, 120);
      expect(e.zones.single.nameMn, '38');
    });

    test('defaults to a normal event for older payloads', () {
      final e = Event.fromJson(_json());
      expect(e.isRink, isFalse);
      expect(e.kind, 'event');
      expect(e.rinkDurationMinutes, isNull);
    });
  });

  group('rink phone', () {
    test('accepts only 8-digit Mongolian mobiles', () {
      for (final ok in ['99112234', '88112233', '66112233', '70112233']) {
        expect(RinkPhoneScreen.isValid(ok), isTrue, reason: ok);
      }
      for (final bad in ['', '9911223', '991122345', '59112234', '9911 223', 'abcdefgh']) {
        expect(RinkPhoneScreen.isValid(bad), isFalse, reason: bad);
      }
    });

    test('travels on the order through copyWith', () {
      final e = Event.fromJson(_json(kind: 'rink', duration: 90));
      final o = TicketOrder(event: e, zone: e.zones.single, quantity: 2);
      expect(o.buyerPhone, isNull);
      final withPhone = o.copyWith(buyerPhone: '99112234');
      expect(withPhone.buyerPhone, '99112234');
      expect(withPhone.quantity, 2);
      expect(withPhone.copyWith(quantity: 3).buyerPhone, '99112234');
    });
  });

  group('strings', () {
    test('a rink shows its duration where an event shows its date', () {
      final mn = S(Lang.mn);
      final en = S(Lang.en);
      final rink = Event.fromJson(_json(kind: 'rink', duration: 120));
      expect(mn.eventWhen(rink), '2 цаг гулгана');
      expect(en.eventWhen(rink), '2 h on the ice');
      expect(mn.rinkDuration(90), '90 минут гулгана');
      expect(mn.sizeLabel('38'), 'Размер 38');
      final match = Event.fromJson(_json());
      expect(mn.eventWhen(match), mn.eventDate(match.startsAt));
    });
  });

  testWidgets('phone keypad enables payment only for a valid number', (tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final e = Event.fromJson(_json(kind: 'rink', duration: 120));
    await tester.pumpWidget(MaterialApp(
      home: AppLang(
        child: RinkPhoneScreen(order: TicketOrder(event: e, zone: e.zones.single, quantity: 1)),
      ),
    ));
    Future<void> tap(String k) async {
      await tester.tap(find.text(k).last);
      await tester.pump();
    }

    for (final d in '5911223'.split('')) {
      await tap(d);
    }
    await tap('4');
    expect(find.text(S(Lang.mn).phoneInvalid), findsOneWidget);

    await tap('C');
    for (final d in '99112234'.split('')) {
      await tap(d);
    }
    expect(find.text('9911 2234'), findsOneWidget);
    expect(find.text(S(Lang.mn).phoneInvalid), findsNothing);
    await tap('⌫');
    expect(find.text('9911 223•'), findsOneWidget);
  });
}
