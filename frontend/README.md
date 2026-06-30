# Stadium Ticketing Kiosk — UI (v0.1)

Self-service event ticketing kiosk for the **National Stadium (Цэнгэлдэх хүрээлэн)**.
This is the **kiosk UI prototype** for a **47" portrait touchscreen (1080×1920)** —
one Flutter codebase that will later also target the web channel.

Design language: minimal/editorial — warm paper background, near-black ink,
hairline dividers, a serif display face, and a single clay/terracotta accent.

> Status: front-end only. Payments, QR, Firebase, QPay and И-Баримт are **mocked**
> behind clearly-marked `// TODO` / "simulate" hooks. No real money moves.

## Screens & flow

```
Home (mascot + event feed)
   └─> Event detail (pick zone + quantity)
          └─> Payment (QPay QR  |  bank card via POS)   ← reservation hold timer
                 └─> Confirmation (QR ticket, printing, email, auto-return home)
```

## What's real vs. placeholder

| Area            | Now (prototype)                                   | Later (production)                                  |
|-----------------|---------------------------------------------------|-----------------------------------------------------|
| Mascot          | `CustomPainter` woman w/ idle/wave/celebrate      | **Rive** state machine (`lib/widgets/mascot.dart`)  |
| QR codes        | Decorative `QrPlaceholder` painter                | `qr_flutter` / server-rendered code                 |
| Catalog         | `lib/data/mock_events.dart`                        | Firebase reads                                      |
| Payment         | "Simulate paid" button                            | QPay invoice + webhook; ECR POS via kiosk agent     |
| Receipt/print   | Animated status steps                             | И-Баримт POS API 3.0 + ESC/POS printers (agent)     |

## Run it

**Requires Flutter 3.27+** (uses `Color.withValues` and `CardThemeData`). Check with `flutter --version`; upgrade with `flutter upgrade` if older.

Flutter isn't committed with platform folders, so generate them once, then run.

```powershell
# 1. Install Flutter SDK (if needed): https://docs.flutter.dev/get-started/install/windows
flutter --version

# 2. Generate platform scaffolding for this existing project (run inside the project dir)
flutter create .

# 3. Get packages
flutter pub get

# 4a. Run on Windows desktop (closest to the real kiosk)
flutter run -d windows

# 4b. Or run the same code in a browser (the future web channel)
flutter run -d chrome
```

> `flutter create .` keeps `lib/`, `pubspec.yaml` etc. and only adds the missing
> `windows/`, `web/`, `android/`… folders. Enable Windows desktop support first
> with `flutter config --enable-windows-desktop` if `-d windows` isn't listed.

## Project layout

```
lib/
  main.dart                 entry point (portrait lock + kiosk window)
  app.dart                  MaterialApp + theme
  theme/                    colours, text styles, MNT/date formatting
  models/                   Event, Zone, TicketOrder
  data/mock_events.dart     sample catalog
  screens/                  home, event detail, payment, confirmation
  widgets/                  mascot, event card, zone tile, qty stepper, QR, scaffold
  services/                 live weather (Open-Meteo)
  l10n/                     strings + language switching
assets/                     events, brand, character, fonts
docs/                       project brief
tool/                       dev scripts (asset generation, fonts, deployment) — see tool/README.md
test/                       widget + golden capture tests
```

## Design notes

- **Portrait (1080×1920), large touch targets**, ~19px+ body text — readable at arm's length.
  The whole UI renders on a fixed portrait canvas scaled to fit any window (`KioskCanvas`),
  so it keeps true kiosk proportions on a laptop/browser (letterboxed).
- **Zones are capacity counters**, never seats (per the brief). Availability bars
  and a "tickets held" countdown reflect the reservation-window requirement.
- Dark "concert at night" palette so event art and the mascot pop on the big panel.
