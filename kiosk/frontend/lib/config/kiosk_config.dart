/// Runtime configuration for the kiosk, supplied at build/run time via
/// `--dart-define`. Nothing secret lives here except the kiosk device key,
/// which is passed in at build time on the box (not committed).
///
/// Example (web kiosk against the live cs360 backend):
///   flutter run -d chrome \
///     --dart-define=KIOSK_API_BASE=https://cs360-backend.onrender.com \
///     --dart-define=KIOSK_KEY=<the X-Kiosk-Key> \
///     --dart-define=KIOSK_ID=stadium-gate-1
///
/// When [apiBase] is empty the app runs fully offline on the bundled mock
/// catalog, so the UI always works even with no backend configured.
class KioskConfig {
  KioskConfig._();

  /// Origin of the cs360 backend (the same API the website uses), e.g.
  /// `https://cs360-backend.onrender.com`. No trailing slash, NO `/api`.
  /// Empty → offline/mock mode.
  static const String apiBase =
      String.fromEnvironment('KIOSK_API_BASE', defaultValue: '');

  /// Device key the backend checks as `X-Kiosk-Key` (the buyer is anonymous;
  /// the kiosk box authenticates). Set on the box only.
  static const String kioskKey =
      String.fromEnvironment('KIOSK_KEY', defaultValue: '');

  /// Optional identifier for which physical kiosk this is (e.g. `gate-1`).
  static const String kioskId =
      String.fromEnvironment('KIOSK_ID', defaultValue: '');

  /// True when a backend URL is configured and the kiosk should read live data.
  static bool get isLive => apiBase.isNotEmpty;

  /// Base URL of the on-box hardware bridge (kiosk-bridge) for card payments,
  /// fiscal receipts and printing. Loopback by default.
  static const String bridgeBase = String.fromEnvironment(
    'KIOSK_BRIDGE_BASE',
    defaultValue: 'http://127.0.0.1:7070',
  );

  /// Build a full URL for a kiosk API path, e.g. `events` → `{base}/api/kiosk/events`.
  static Uri kioskApi(String path) =>
      Uri.parse('$apiBase/api/kiosk/${path.replaceFirst(RegExp(r'^/'), '')}');

  /// Headers identifying the kiosk device on every backend call.
  static Map<String, String> get kioskHeaders => {
        if (kioskKey.isNotEmpty) 'X-Kiosk-Key': kioskKey,
        if (kioskId.isNotEmpty) 'X-Kiosk-Id': kioskId,
      };

  /// Build a full URL for an on-box bridge path (e.g. `print/ticket`).
  static Uri bridge(String path) =>
      Uri.parse('$bridgeBase/${path.replaceFirst(RegExp(r'^/'), '')}');

  /// How long to wait on a catalog fetch before falling back to cached/mock.
  static const Duration fetchTimeout = Duration(seconds: 8);

  /// How long to wait on a single payment/print call before erroring.
  static const Duration paymentTimeout = Duration(seconds: 15);
}
