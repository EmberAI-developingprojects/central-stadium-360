import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// A compact, email-oriented on-screen keyboard for the touchscreen kiosk
/// (there is no physical keyboard). Pure input: it reports edits through
/// [onChanged]; the parent owns the value and the Send/Cancel actions.
class OnScreenKeyboard extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const OnScreenKeyboard({super.key, required this.value, required this.onChanged});

  static const _rows = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

  void _type(String ch) => onChanged(value + ch);
  void _append(String s) => onChanged(value + s);
  void _backspace() {
    if (value.isNotEmpty) onChanged(value.substring(0, value.length - 1));
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final row in _rows.take(3))
          _row([for (final c in row.split('')) _key(c, () => _type(c))]),
        // Last letter row shares space with backspace.
        _row([
          for (final c in _rows[3].split('')) _key(c, () => _type(c)),
          _key('⌫', _backspace, flex: 2, accent: true),
        ]),
        // Symbols + domain shortcuts to make email entry fast.
        _row([
          _key('@', () => _type('@')),
          _key('.', () => _type('.')),
          _key('_', () => _type('_')),
          _key('-', () => _type('-')),
          _key('.com', () => _append('.com'), flex: 2),
          _key('.mn', () => _append('.mn'), flex: 2),
          _key('gmail.com', () => _append('gmail.com'), flex: 3),
        ]),
      ],
    );
  }

  Widget _row(List<Widget> keys) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: keys),
      );

  Widget _key(String label, VoidCallback onTap, {int flex = 1, bool accent = false}) {
    return Expanded(
      flex: flex,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 5),
        child: Material(
          color: accent ? AppColors.accentTint : AppColors.bg1,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Container(
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.stroke),
              ),
              child: Text(
                label,
                style: TextStyle(
                  fontFamily: 'Manrope',
                  fontSize: label.length > 1 ? 18 : 22,
                  fontWeight: FontWeight.w600,
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
