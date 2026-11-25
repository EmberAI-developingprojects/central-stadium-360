import 'package:flutter/material.dart';
import '../l10n/strings.dart';
import '../services/bridge_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import '../theme/decorations.dart';
import 'kiosk_scaffold.dart';

/// Who the И-Баримт belongs to: the buyer in person, or their company.
class Receiver {
  /// Empty for a citizen; the company's ТТД for a B2B sale.
  final String tin;
  final String name;
  const Receiver.citizen() : tin = '', name = '';
  const Receiver.company({required this.tin, required this.name});

  bool get isCompany => tin.isNotEmpty;
}

/// Asks who the receipt is for, and — for a company — resolves the register
/// number the buyer types into a real organisation they then confirm.
///
/// The confirmation step is the point of this widget: a mistyped digit is a
/// valid register number belonging to somebody else, and a fiscal receipt
/// written to the wrong company cannot be taken back.
class ReceiverPicker extends StatefulWidget {
  final ValueChanged<Receiver> onChosen;
  const ReceiverPicker({super.key, required this.onChosen});

  @override
  State<ReceiverPicker> createState() => _ReceiverPickerState();
}

enum _Phase { choose, entry, checking, confirm, notFound }

class _ReceiverPickerState extends State<ReceiverPicker> {
  _Phase _phase = _Phase.choose;
  String _regno = '';
  OrgLookup? _found;

  static const _regnoLength = 7;

  void _type(String d) {
    if (_regno.length >= _regnoLength) return;
    setState(() => _regno += d);
  }

  void _backspace() {
    if (_regno.isEmpty) return;
    setState(() => _regno = _regno.substring(0, _regno.length - 1));
  }

  Future<void> _lookup() async {
    setState(() => _phase = _Phase.checking);
    final org = await BridgeService.lookupOrg(_regno);
    if (!mounted) return;
    setState(() {
      _found = org;
      _phase = org == null ? _Phase.notFound : _Phase.confirm;
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: AppDeco.glass(radius: 24),
      child: switch (_phase) {
        _Phase.choose => _chooseView(s),
        _Phase.entry => _entryView(s),
        _Phase.checking => _checkingView(s),
        _Phase.confirm => _confirmView(s),
        _Phase.notFound => _notFoundView(s),
      },
    );
  }

  // --- 1. citizen or company --------------------------------------------
  Widget _chooseView(S s) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(s.receiptFor, style: KioskText.h1),
        const SizedBox(height: 8),
        Text(s.receiptForSub, style: KioskText.body),
        const SizedBox(height: 26),
        Row(
          children: [
            Expanded(
              child: _Choice(
                icon: Icons.person_rounded,
                label: s.asPerson,
                onTap: () => widget.onChosen(const Receiver.citizen()),
              ),
            ),
            const SizedBox(width: 18),
            Expanded(
              child: _Choice(
                icon: Icons.apartment_rounded,
                label: s.asCompany,
                onTap: () => setState(() => _phase = _Phase.entry),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- 2. register-number keypad ----------------------------------------
  Widget _entryView(S s) {
    final ready = _regno.length == _regnoLength;
    return Column(
      children: [
        Text(s.companyRegno, style: KioskText.title),
        const SizedBox(height: 6),
        Text(s.companyRegnoSub, style: KioskText.body.copyWith(fontSize: 16)),
        const SizedBox(height: 20),
        _RegnoDisplay(value: _regno, length: _regnoLength),
        const SizedBox(height: 22),
        _Keypad(onDigit: _type, onBackspace: _backspace),
        const SizedBox(height: 22),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            GhostButton(
              label: s.back,
              onPressed: () => setState(() {
                _regno = '';
                _phase = _Phase.choose;
              }),
            ),
            const SizedBox(width: 16),
            PrimaryButton(
              label: s.checkCompany,
              icon: Icons.search_rounded,
              onPressed: ready ? _lookup : null,
            ),
          ],
        ),
      ],
    );
  }

  Widget _checkingView(S s) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          const SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(strokeWidth: 4, color: AppColors.magenta),
          ),
          const SizedBox(height: 24),
          Text(s.checkingCompany, style: KioskText.title),
        ],
      ),
    );
  }

  // --- 3. "is this your organisation?" -----------------------------------
  Widget _confirmView(S s) {
    final org = _found!;
    return Column(
      children: [
        const Icon(Icons.apartment_rounded, size: 56, color: AppColors.magenta),
        const SizedBox(height: 18),
        Text(s.isThisYourCompany, textAlign: TextAlign.center, style: KioskText.title),
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
          decoration: BoxDecoration(
            color: AppColors.glassHi,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.stroke),
          ),
          child: Column(
            children: [
              Text(
                org.name.isEmpty ? s.companyNameUnknown : org.name,
                textAlign: TextAlign.center,
                style: KioskText.display.copyWith(fontSize: 30),
              ),
              const SizedBox(height: 10),
              Text('${s.regnoShort} ${org.regno}   ·   ${s.tinShort} ${org.tin}',
                  textAlign: TextAlign.center,
                  style: KioskText.body.copyWith(fontSize: 16)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            GhostButton(
              label: s.no,
              onPressed: () => setState(() {
                _regno = '';
                _found = null;
                _phase = _Phase.entry;
              }),
            ),
            const SizedBox(width: 16),
            PrimaryButton(
              label: s.yesThisIsIt,
              icon: Icons.check_rounded,
              onPressed: () => widget.onChosen(
                Receiver.company(tin: org.tin, name: org.name),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _notFoundView(S s) {
    return Column(
      children: [
        const Icon(Icons.search_off_rounded, size: 56, color: AppColors.danger),
        const SizedBox(height: 18),
        Text(s.companyNotFound, textAlign: TextAlign.center, style: KioskText.title),
        const SizedBox(height: 10),
        Text(s.companyNotFoundSub,
            textAlign: TextAlign.center, style: KioskText.body.copyWith(fontSize: 16)),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            GhostButton(
              label: s.asPerson,
              onPressed: () => widget.onChosen(const Receiver.citizen()),
            ),
            const SizedBox(width: 16),
            PrimaryButton(
              label: s.tryAgain,
              icon: Icons.refresh_rounded,
              onPressed: () => setState(() {
                _regno = '';
                _phase = _Phase.entry;
              }),
            ),
          ],
        ),
      ],
    );
  }
}

/// One of the two big "person / company" targets.
class _Choice extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _Choice({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: AppDeco.glass(radius: 16),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 30),
            child: Column(
              children: [
                Icon(icon, size: 40, color: AppColors.magenta),
                const SizedBox(height: 14),
                Text(label, style: KioskText.title),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The typed register number, shown as fixed digit slots so the buyer can see
/// at a glance how many are still missing.
class _RegnoDisplay extends StatelessWidget {
  final String value;
  final int length;
  const _RegnoDisplay({required this.value, required this.length});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        for (var i = 0; i < length; i++)
          Container(
            width: 62,
            height: 78,
            margin: const EdgeInsets.symmetric(horizontal: 5),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.bg1,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: i == value.length ? AppColors.magenta : AppColors.stroke,
                width: i == value.length ? 2 : 1,
              ),
            ),
            child: Text(
              i < value.length ? value[i] : '',
              style: KioskText.display.copyWith(fontSize: 34),
            ),
          ),
      ],
    );
  }
}

/// 0-9 plus backspace, in the same key style as the email keyboard.
class _Keypad extends StatelessWidget {
  final ValueChanged<String> onDigit;
  final VoidCallback onBackspace;
  const _Keypad({required this.onDigit, required this.onBackspace});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 460,
      child: Column(
        children: [
          for (final row in const ['123', '456', '789'])
            _row([for (final c in row.split('')) _key(c, () => onDigit(c))]),
          _row([
            _key('', null),
            _key('0', () => onDigit('0')),
            _key('⌫', onBackspace, accent: true),
          ]),
        ],
      ),
    );
  }

  Widget _row(List<Widget> keys) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(children: keys),
      );

  Widget _key(String label, VoidCallback? onTap, {bool accent = false}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 5),
        child: Material(
          color: onTap == null
              ? Colors.transparent
              : (accent ? AppColors.accentTint : AppColors.bg1),
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: Container(
              height: 74,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: onTap == null ? null : Border.all(color: AppColors.stroke),
              ),
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Manrope',
                  fontSize: 26,
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
