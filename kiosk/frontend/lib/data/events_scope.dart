import 'dart:async';

import 'package:flutter/material.dart';
import '../config/kiosk_config.dart';
import '../models/event.dart';
import '../services/events.dart';
import 'mock_events.dart';

/// Where the currently-shown catalog came from — drives nothing user-facing by
/// default, but handy for a discreet status dot / debugging on the kiosk.
enum CatalogSource { loading, live, fallback }

/// Loads the event catalog once on startup (and on [refresh]) from the cloud
/// backend, and exposes it to the widget tree. Falls back to the bundled
/// [kMockEvents] if the backend is unconfigured or unreachable, so the kiosk
/// always has something to show. Mirrors the lightweight [AppLang] pattern.
class EventsScope extends StatefulWidget {
  final Widget child;
  const EventsScope({super.key, required this.child});

  static _EventsScopeState _of(BuildContext context) =>
      context.findAncestorStateOfType<_EventsScopeState>()!;

  /// Re-fetch the catalog from the backend (e.g. a periodic refresh timer or a
  /// hidden admin gesture). Safe to call anytime.
  static Future<void> refresh(BuildContext context) => _of(context)._load();

  @override
  State<EventsScope> createState() => _EventsScopeState();
}

class _EventsScopeState extends State<EventsScope> {
  /// How often to re-fetch the live catalog so admin edits (prices, capacity,
  /// new events) show up on the kiosk without restarting the app.
  static const Duration _refreshInterval = Duration(seconds: 60);

  List<Event> _events = kMockEvents;
  CatalogSource _source = CatalogSource.loading;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _load();
    // Poll the cs360 backend periodically (live mode only) so the catalog stays
    // in sync with the admin panel. Offline/mock mode never starts a timer.
    if (KioskConfig.isLive) {
      _refreshTimer = Timer.periodic(_refreshInterval, (_) => _load());
    }
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    if (!KioskConfig.isLive) {
      // Offline/mock mode — keep the bundled catalog, no network attempt.
      if (mounted) setState(() => _source = CatalogSource.fallback);
      return;
    }
    try {
      final live = await EventsService.fetchAll();
      if (!mounted) return;
      setState(() {
        _events = live;
        _source = CatalogSource.live;
      });
    } catch (e) {
      // Never surface an error on a kiosk — fall back to the last good list
      // (bundled mock on first load) so the screen stays usable.
      debugPrint('EventsScope: falling back to bundled catalog ($e)');
      if (mounted) setState(() => _source = CatalogSource.fallback);
    }
  }

  @override
  Widget build(BuildContext context) {
    return EventsData(events: _events, source: _source, child: widget.child);
  }
}

/// Inherited handle exposing the current catalog to any descendant.
class EventsData extends InheritedWidget {
  final List<Event> events;
  final CatalogSource source;
  const EventsData({
    super.key,
    required this.events,
    required this.source,
    required super.child,
  });

  static EventsData of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<EventsData>();
    assert(scope != null, 'EventsData not found — wrap the app in an EventsScope');
    return scope!;
  }

  @override
  bool updateShouldNotify(EventsData old) =>
      old.events != events || old.source != source;
}

/// Convenience: `context.events`.
extension EventsContext on BuildContext {
  List<Event> get events => EventsData.of(this).events;
}
