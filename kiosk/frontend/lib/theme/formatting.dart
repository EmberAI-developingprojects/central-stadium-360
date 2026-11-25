/// Small formatting helpers (no `intl` dependency for the v1 scaffold).
library;

/// Formats an integer amount of Mongolian Tögrög, e.g. 85000 -> "85,000₮".
String formatMnt(int amount) {
  final s = amount.abs().toString();
  final buf = StringBuffer();
  for (int i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(',');
    buf.write(s[i]);
  }
  final sign = amount < 0 ? '-' : '';
  return '$sign$buf₮';
}

const _weekdaysMn = ['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням'];
const _monthsEn = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// e.g. "Бям, 14 Jun · 20:00"
String formatEventDate(DateTime dt) {
  final wd = _weekdaysMn[dt.weekday - 1];
  final mon = _monthsEn[dt.month - 1];
  final hh = dt.hour.toString().padLeft(2, '0');
  final mm = dt.minute.toString().padLeft(2, '0');
  return '$wd, ${dt.day} $mon · $hh:$mm';
}

/// e.g. "20:00"
String formatTime(DateTime dt) {
  final hh = dt.hour.toString().padLeft(2, '0');
  final mm = dt.minute.toString().padLeft(2, '0');
  return '$hh:$mm';
}
