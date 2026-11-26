import 'package:flutter/widgets.dart';
import 'app_lang.dart';
import '../models/event.dart';

/// All UI strings, localized MN/EN. Access with `S.of(context)`.
class S {
  final Lang lang;
  const S(this.lang);

  static S of(BuildContext context) => S(context.lang);

  bool get _mn => lang == Lang.mn;
  String _t(String mn, String en) => _mn ? mn : en;

  // Top bar
  String get venueWordmark => 'ЦЭНГЭЛДЭХ';
  String get venueSub => _t('ҮНДЭСНИЙ ЦЭНГЭЛДЭХ · ТАСАЛБАР', 'NATIONAL STADIUM · TICKETS');
  String get back => _t('Буцах', 'Back');

  // Home
  String get welcome => _t('Тавтай морилно уу', 'Welcome');
  String get homeHeadline => _t('Том тоглолтын\nтасалбар.', 'Tickets for\nthe big nights.');
  String get onSaleNow => _t('Зарагдаж байна', 'On sale now');
  String eventsCount(int n) => _t('$n тоглолт', '$n events');
  String get fromPrice => _t('ЭХЛЭХ ҮНЭ', 'FROM');
  String get soldOut => _t('Зарагдсан', 'Sold out');
  String get soldOutCaps => _t('ЗАРАГДСАН', 'SOLD OUT');

  // Home hero (virtual host)
  String get assistantName => _t('Хулан', 'Khulan');
  String get heroGreeting => _t(
      'Сайн байна уу! Би Хулан 👋 Тасалбараа надтай хамт хялбар аваарай.',
      "Hi! I'm Khulan 👋 Let's get you tickets — just tap below.");
  String get heroTagline => _t('Танд хэрхэн туслах вэ?', 'How can I help you today?');
  String get buyTickets => _t('Тасалбар авах', 'Buy tickets');
  String get buyTicketsSub => _t('Тоглолтоо сонгоод эхлээрэй', 'Pick an event & check out');
  String get browseEvents => _t('Тоглолтууд', "What's on");
  String get browseEventsSub => _t('Бүх тоглолтыг үзэх', 'See all events');
  String get askHelp => _t('Тусламж', 'Ask for help');
  String get askHelpSub => _t('Би туслахад бэлэн', "I'm here to help");
  String get helpBody => _t(
      'Тасалбар авахын тулд "Тасалбар авах" дээр дарж тоглолтоо сонгоод, бүс, тоо ширхэгээ сонгон төлбөрөө төлнө үү. Ажилтнаас тусламж хүсч болно.',
      'To buy a ticket, tap “Buy tickets”, choose an event, pick a zone and quantity, then pay. A staff member is nearby if you need a hand.');

  // Upcoming banner
  String get upcoming => _t('Удахгүй болох тоглолтууд', 'Upcoming events');
  String get upcomingTag => _t('Удахгүй болох', 'Upcoming');

  // FAQ
  String get faq => _t('Түгээмэл асуулт', 'FAQ');
  String get faqSub => _t('Тасалбар, төлбөрийн талаар', 'Tickets & payment');
  List<(String, String)> get faqItems => [
        (
          _t('Тасалбараа хэрхэн авах вэ?', 'How do I buy a ticket?'),
          _t('"Тасалбар авах" дээр дарж тоглолтоо сонгоод, бүс ба тоо ширхэгээ сонгон төлбөрөө төлнө үү.',
              'Tap “Buy tickets”, choose an event, pick a zone and quantity, then pay.'),
        ),
        (
          _t('Ямар төлбөрийн хэлбэр байдаг вэ?', 'How can I pay?'),
          _t('QPay (банкны аппаар QR уншуулах) эсвэл банкны картаар терминал дээр төлж болно.',
              'Pay with QPay (scan the QR in your banking app) or a bank card at the terminal.'),
        ),
        (
          _t('Тасалбараа хаанаас авах вэ?', 'Where do I get my ticket?'),
          _t('Төлбөр амжилттай болсны дараа QR тасалбар болон И-Баримт энд дэлгэцэн дээр гарч ирнэ — утсаараа уншуулж эсвэл зургийг авч хадгална уу.',
              'After payment your QR ticket and И-Баримт receipt appear here on screen — scan them with your phone or take a photo to keep them.'),
        ),
        (
          _t('Суудлаа сонгох уу?', 'Do I pick a seat?'),
          _t('Үгүй. Бүс бол талбай — тоот суудал биш. Та зөвхөн бүсээ сонгоно.',
              'No. Zones are areas, not numbered seats — you only choose a zone.'),
        ),
      ];

  // Weather
  String get cityUlaanbaatar => _t('Улаанбаатар', 'Ulaanbaatar');

  // Event detail
  String get chooseZone => _t('Бүсээ сонгоно уу', 'Choose your zone');

  // Ice rink
  String get chooseSize => _t('Гутлын размераа сонгоно уу', 'Choose your skate size');
  String get sizesHint => _t('Нэг тасалбар = нэг хос гутал.', 'One ticket = one pair of skates.');
  String sizeLabel(String size) => _t('Размер $size', 'Size $size');
  String rinkDuration(int minutes) {
    final mn = minutes % 60 == 0 ? '${minutes ~/ 60} цаг' : '$minutes минут';
    final en = minutes % 60 == 0 ? '${minutes ~/ 60} h' : '$minutes min';
    return _t('$mn гулгана', '$en on the ice');
  }
  String get rinkStartsAtScan =>
      _t('Цаг тань тасалбараа уншуулснаас эхэлнэ', 'Your time starts when your ticket is scanned');
  String get rinkOvertimeNote =>
      _t('Цаг хэтэрвэл минут бүрт нэмэлт төлбөртэй.', 'Going over time is charged per minute.');
  /// The "when" line for a card or summary: a rink has a duration, not a date.
  String eventWhen(Event e) =>
      e.isRink ? rinkDuration(e.rinkDurationMinutes ?? 0) : eventDate(e.startsAt);

  String get phoneTitle => _t('Утасны дугаараа оруулна уу', 'Enter your phone number');
  String get phoneHint => _t(
        'Цаг дуусахаас 10 минутын өмнө SMS ирнэ. LED дэлгэц дээр дугаараараа өөрийгөө харна.',
        'You get an SMS 10 minutes before your time ends, and find yourself on the LED board by your number.',
      );
  String get phoneLabel => _t('Утас', 'Phone');
  String get skatesLabel => _t('Гутал', 'Skates');
  String get phoneInvalid => _t('8 оронтой гар утасны дугаар оруулна уу', 'Enter an 8-digit mobile number');
  String get zonesHint => _t('Бүс гэдэг нь талбай, тоот суудал биш.', 'Zones are areas, not numbered seats.');
  String get quantity => _t('ТОО ШИРХЭГ', 'QUANTITY');
  String get total => _t('НИЙТ ДҮН', 'TOTAL');
  String get continueToPayment => _t('Төлбөр рүү шилжих', 'Continue to payment');
  String onlyNLeft(int n) => _t('Зөвхөн $n үлдсэн', 'Only $n left');
  String nAvailable(int n) => _t('$n боломжтой', '$n available');

  // Payment
  String get order => _t('ЗАХИАЛГА', 'ORDER');
  String get when => _t('Хэзээ', 'When');
  String get zone => _t('Бүс', 'Zone');
  String get quantityLabel => _t('Тоо ширхэг', 'Quantity');
  String get unitPrice => _t('Нэгж үнэ', 'Unit price');
  String get totalPlain => _t('Нийт дүн', 'Total');
  String get ticketsHeld => _t('Тасалбарыг тань хадгалж байна', 'Tickets held for you');
  String get howToPay => _t('Хэрхэн төлөх вэ?', 'How would you like to pay?');
  String get qpay => 'QPay';
  String get qpaySub => _t('Банкны аппаар уншуулна уу', 'Scan with your banking app');
  String get bankCard => _t('Банкны карт', 'Bank card');
  String get bankCardSub => _t('Терминал дээр уншуулна уу', 'Tap or insert at the terminal');
  String get selectMethod =>
      _t('Үргэлжлүүлэхийн тулд төлбөрийн хэлбэрээ сонгоно уу.', 'Select a payment method to continue.');
  String get scanToPay => _t('QPay-ээр төлөхийн тулд уншуулна уу', 'Scan to pay with QPay');
  String get waitingConfirm => _t('Төлбөрийн баталгаажуулалтыг хүлээж байна…', 'Waiting for payment confirmation…');
  String get simulatePaid => _t('Төлсөн гэж үзэх', 'Simulate paid');
  String get cardPrompt =>
      _t('Доорх карт уншигчийн\nзаавраар үйлдэнэ үү', 'Follow the prompts on the\ncard terminal below');
  String get simulateApproved => _t('Зөвшөөрсөн гэж үзэх', 'Simulate approved');
  String get confirmingPayment => _t('Төлбөрийг баталгаажуулж байна…', 'Confirming payment…');
  String get reservationExpired =>
      _t('Захиалга цуцлагдлаа — дахин эхлүүлнэ үү.', 'Reservation expired — please start again.');
  String get tryAgain => _t('Дахин оролдох', 'Try again');

  // И-Баримт receiver (B2C / B2B)
  String get receiptFor => _t('И-Баримт хэнд бичих вэ?', 'Who is the receipt for?');
  String get receiptForSub => _t(
      'Байгууллагын нэр дээр бичүүлэх бол регистрийн дугаараа оруулна.',
      'To bill a company, enter its register number.');
  String get asPerson => _t('Хувь хүн', 'Individual');
  String get asCompany => _t('Байгууллага', 'Company');
  String get companyRegno => _t('Байгууллагын регистрийн дугаар', "Company's register number");
  String get companyRegnoSub => _t('7 оронтой дугаар', '7 digits');
  String get checkCompany => _t('Шалгах', 'Check');
  String get checkingCompany => _t('Байгууллагыг шалгаж байна…', 'Checking the company…');
  String get isThisYourCompany => _t('Энэ байгууллага мөн үү?', 'Is this your organisation?');
  String get companyNameUnknown => _t('(нэр олдсонгүй)', '(name not listed)');
  String get regnoShort => _t('РД', 'Reg.');
  String get tinShort => _t('ТТД', 'TIN');
  String get yesThisIsIt => _t('Тийм, зөв байна', "Yes, that's it");
  String get no => _t('Үгүй', 'No');
  String get companyNotFound => _t('Байгууллага олдсонгүй', 'Organisation not found');
  String get companyNotFoundSub => _t(
      'Регистрийн дугаараа шалгаад дахин оруулна уу, эсвэл хувь хүнээр авна уу.',
      'Check the register number and try again, or take it as an individual.');
  String get receiptTo => _t('И-Баримт', 'Receipt');
  String get changeReceiver => _t('Өөрчлөх', 'Change');
  String get waitingPrint =>
      _t('Та баримт хэвлэх хүртэл түр хүлээнэ үү', 'Please wait while your receipt prints');
  String get waitingPrintSub => _t(
      'Тасалбар болон И-Баримт хэвлэгдэж байна. Хэвлэгчээс баримтаа авна уу.',
      'Your ticket and fiscal receipt are printing. Please take them from the printer.');
  String get printSlow => _t(
      'Төлбөр амжилттай хийгдсэн. Баримт хэвлэгдээгүй бол ажилтанд хандана уу.',
      'Your payment went through. If nothing printed, please ask a member of staff.');

  // Confirmation (all-digital — nothing is printed)
  String get confirmed => _t('БАТАЛГААЖЛАА', 'CONFIRMED');
  String get enjoyShow => _t('Цагийг сайхан өнгөрүүлээрэй.', 'Have a wonderful time.');
  String get confirmIntro => _t(
      'Доорх QR-уудыг утсаараа уншуулна уу. Тасалбараа хадгалахын тулд дэлгэцийн зургийг авч болно.',
      'Scan the QR codes below with your phone. Take a photo of the screen to keep them.');
  String get yourTicket => _t('Таны тасалбар', 'Your ticket');
  String get showAtGate => _t('Хаалган дээр энэ QR-ийг үзүүлнэ үү', 'Show this QR at the gate');
  String ticketIndex(int i, int n) => _t('Тасалбар $i/$n', 'Ticket $i of $n');
  String get ebarimtTitle => _t('И-Баримт', 'И-Баримт fiscal receipt');
  String get ebarimtSub => _t('НӨАТ-ын баримтыг утсаараа уншуулна уу', 'Scan the fiscal receipt with your phone');
  String get lotteryLabel => _t('Сугалааны дугаар', 'Lottery number');
  String get keepPhotoHint => _t(
      'Тасалбараа хадгалахын тулд дэлгэцийн зургийг аваарай.',
      'Take a photo of the screen to keep your ticket.');
  String get returningSoon => _t('Удахгүй эхлэл рүү буцна…', 'Returning to start shortly…');
  String get done => _t('Болсон', 'Done');

  // Email the ticket
  String get emailTicket => _t('Имэйлээр авах', 'Email my ticket');
  String get emailPrompt => _t('Имэйл хаягаа оруулна уу', 'Enter your email address');
  String get emailHint => _t('жишээ: name@gmail.com', 'e.g. name@gmail.com');
  String get send => _t('Илгээх', 'Send');
  String get cancel => _t('Болих', 'Cancel');
  String get sending => _t('Илгээж байна…', 'Sending…');
  String emailSent(String addr) => _t('$addr руу илгээлээ', 'Sent to $addr');
  String get emailFailed => _t('Илгээж чадсангүй. Дахин оролдоно уу.', "Couldn't send. Please try again.");
  String get invalidEmail => _t('Имэйл хаяг буруу байна.', 'That email address looks wrong.');

  // ---- Localized date ----
  static const _weekdayMn = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
  static const _weekdayEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  static const _monthEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /// Localized full weekday name, e.g. "Бямба" / "Sat".
  String weekdayName(DateTime dt) => (_mn ? _weekdayMn : _weekdayEn)[dt.weekday - 1];

  /// Short date — MN: "5-р сарын 30"   EN: "30 May".
  String dateShort(DateTime dt) =>
      _mn ? '${dt.month}-р сарын ${dt.day}' : '${dt.day} ${_monthEn[dt.month - 1]}';

  /// MN: "Бямба, 5-р сарын 30 · 20:00"   EN: "Sat, 30 May · 20:00"
  String eventDate(DateTime dt) {
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    if (_mn) {
      final wd = _weekdayMn[dt.weekday - 1];
      return '$wd, ${dt.month}-р сарын ${dt.day} · $hh:$mm';
    }
    final wd = _weekdayEn[dt.weekday - 1];
    return '$wd, ${dt.day} ${_monthEn[dt.month - 1]} · $hh:$mm';
  }
}
