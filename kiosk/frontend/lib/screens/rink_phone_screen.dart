import 'package:flutter/material.dart';
import '../l10n/strings.dart';
import '../models/ticket_order.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../widgets/kiosk_scaffold.dart';
import 'payment_screen.dart';

/// Ice rink: the buyer's mobile number, asked before payment. The rink's LED
/// board lists skaters by this number and the end-of-time SMS goes to it.
class RinkPhoneScreen extends StatefulWidget {
  final TicketOrder order;
  const RinkPhoneScreen({super.key, required this.order});

  /// Mongolian mobile: 8 digits starting 6-9 (same rule as the backend).
  static bool isValid(String digits) => RegExp(r'^[6-9]\d{7}$').hasMatch(digits);

  @override
  State<RinkPhoneScreen> createState() => _RinkPhoneScreenState();
}

class _RinkPhoneScreenState extends State<RinkPhoneScreen> {
  String _digits = '';

  bool get _valid => RinkPhoneScreen.isValid(_digits);

  void _press(String d) {
    if (_digits.length >= 8) return;
    setState(() => _digits += d);
  }

  void _backspace() {
    if (_digits.isEmpty) return;
    setState(() => _digits = _digits.substring(0, _digits.length - 1));
  }

  void _continue() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => PaymentScreen(order: widget.order.copyWith(buyerPhone: _digits)),
      ),
    );
  }

  String get _shown {
    if (_digits.isEmpty) return '•••• ••••';
    final padded = _digits.padRight(8, '•');
    return '${padded.substring(0, 4)} ${padded.substring(4)}';
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final showError = _digits.length == 8 && !_valid;
    return KioskScaffold(
      showBack: true,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(56, 40, 56, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(s.phoneTitle, style: KioskText.display.copyWith(fontSize: 44)),
            const SizedBox(height: 14),
            Text(s.phoneHint, style: KioskText.body.copyWith(fontSize: 19)),
            const SizedBox(height: 36),
            Container(
              padding: const EdgeInsets.symmetric(vertical: 26),
              decoration: BoxDecoration(
                color: AppColors.bg1,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: showError ? Colors.redAccent : AppColors.stroke, width: 2),
              ),
              alignment: Alignment.center,
              child: Text(
                _shown,
                style: KioskText.display.copyWith(fontSize: 64, letterSpacing: 6),
              ),
            ),
            SizedBox(
              height: 40,
              child: showError
                  ? Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Text(s.phoneInvalid,
                          style: KioskText.body.copyWith(color: Colors.redAccent, fontSize: 18)),
                    )
                  : null,
            ),
            Expanded(child: Center(child: _keypad())),
            PrimaryButton(
              label: s.continueToPayment,
              icon: Icons.arrow_forward_rounded,
              expand: true,
              onPressed: _valid ? _continue : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _keypad() {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 560),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final row in rows) Row(children: [for (final d in row) _key(d, () => _press(d))]),
          Row(children: [
            _key('C', () => setState(() => _digits = ''), accent: true),
            _key('0', () => _press('0')),
            _key('⌫', _backspace, accent: true),
          ]),
        ],
      ),
    );
  }

  Widget _key(String label, VoidCallback onTap, {bool accent = false}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Material(
          color: accent ? AppColors.accentTint : AppColors.bg1,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onTap,
            child: Container(
              height: 96,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.stroke),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Manrope',
                  fontSize: 36,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
