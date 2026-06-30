import 'package:flutter/material.dart';
import '../models/event.dart';
import '../models/zone.dart';

/// Catalog for the UI prototype, using the real event banners in assets/events.
/// Replace with a Firebase read in production. Strings are bilingual (MN/EN).

const _vipMn = 'VIP — Ширээний үйлчилгээ';
const _vipEn = 'VIP — Table service';

final List<Event> kMockEvents = [
  Event(
    id: 'evt_ginjin',
    title: 'Zunii Zugaa: Homecoming 26',
    subtitleMn: 'Гинжин · Хип-хоп тоглолт',
    subtitleEn: 'Ginjin · Hip-hop concert',
    startsAt: DateTime(2026, 5, 30, 20, 0),
    venue: 'Цэнгэлдэх хүрээлэн · National Stadium',
    descriptionMn:
        'Гинжин төрөлх нутагтаа эргэн ирж, цэнгэлдэхийг донсолгоно. Тусгай '
        'зочид, бүрэн тайзны бэлтгэл, хотын гэрлэн чимэглэлтэй тоглолт.',
    descriptionEn:
        'Ginjin comes home for a stadium-sized night of Mongolian hip-hop. '
        'Special guests, full live production and city lights.',
    image: 'assets/events/ginjin.png',
    icon: Icons.mic_external_on_rounded,
    tint: Color(0xFFC39A4E),
    zones: [
      Zone(
        id: 'z_vip',
        nameMn: _vipMn,
        nameEn: _vipEn,
        descMn: 'Тайзанд хамгийн ойр · ширээтэй · тусгай үйлчилгээ',
        descEn: 'Closest to stage · seated tables · dedicated service',
        price: 250000,
        capacity: 120,
        sold: 96,
        color: Color(0xFFC39A4E),
      ),
      Zone(
        id: 'z_premium',
        nameMn: 'Premium зогсох',
        nameEn: 'Premium standing',
        descMn: 'Тайзны урд зогсох талбай',
        descEn: 'Front standing pit, close to the stage',
        price: 150000,
        capacity: 800,
        sold: 540,
        color: Color(0xFFB05A3C),
      ),
      Zone(
        id: 'z_general',
        nameMn: 'Энгийн тасалбар',
        nameEn: 'General admission',
        descMn: 'Талбай ба индэр',
        descEn: 'Open stadium floor & stands',
        price: 75000,
        capacity: 4000,
        sold: 1820,
        color: Color(0xFF2F6E8F),
      ),
    ],
  ),
  Event(
    id: 'evt_tengri',
    title: 'THUNDERZ — Tengri',
    subtitleMn: 'Tengri · Тоглолт',
    subtitleEn: 'Tengri · Live show',
    startsAt: DateTime(2026, 5, 23, 19, 30),
    venue: 'Цэнгэлдэх хүрээлэн · National Stadium',
    descriptionMn:
        'THUNDERZ "Tengri" тоглолтоо толилуулна — өвлийн тэнгэрийн дор болох '
        'кино шиг гайхалтай тайзны бүтээл. Гэрэл, хөгжим, мартагдашгүй орчин.',
    descriptionEn:
        'THUNDERZ presents "Tengri" — a cinematic open-air production under '
        'the winter sky. Lights, drums and an unforgettable entrance.',
    image: 'assets/events/tengri.png',
    icon: Icons.ac_unit_rounded,
    tint: Color(0xFF2F6E8F),
    zones: [
      Zone(
        id: 'z_vip',
        nameMn: _vipMn,
        nameEn: _vipEn,
        descMn: 'Тайзанд ойр VIP суудал, үйлчилгээтэй',
        descEn: 'Premium close-to-stage seating with service',
        price: 180000,
        capacity: 150,
        sold: 150, // sold out — exercises the sold-out state
        color: Color(0xFFC39A4E),
      ),
      Zone(
        id: 'z_premium',
        nameMn: 'Premium',
        nameEn: 'Premium',
        descMn: 'Урд талын захиалгат зогсох',
        descEn: 'Reserved standing near the front',
        price: 95000,
        capacity: 1200,
        sold: 410,
        color: Color(0xFFB05A3C),
      ),
      Zone(
        id: 'z_general',
        nameMn: 'Энгийн тасалбар',
        nameEn: 'General admission',
        descMn: 'Талбай ба индэр',
        descEn: 'Stadium floor & stands',
        price: 45000,
        capacity: 6000,
        sold: 980,
        color: Color(0xFF2F6E8F),
      ),
    ],
  ),
  Event(
    id: 'evt_sarantuya',
    title: 'Хайрын Бурхан — Б. Сарантуяа',
    subtitleMn: 'Б. Сарантуяа · Тоглолт · 40 жил',
    subtitleEn: 'B. Sarantuya · Live concert · 40 years',
    startsAt: DateTime(2026, 6, 6, 20, 0),
    venue: 'Цэнгэлдэх хүрээлэн · National Stadium',
    descriptionMn:
        'Монголын хамгийн хайртай дуучдын нэгний тайзан дээрх 40 жилийн ойг '
        'тэмдэглэх онцгой үдэш. Найрал хөгжим, зочид болон дуртай дуунууд.',
    descriptionEn:
        'A landmark evening celebrating 40 years on stage from one of '
        'Mongolia\'s most beloved voices. Orchestra, guests and the hits.',
    image: 'assets/events/sarantuya.png',
    icon: Icons.music_note_rounded,
    tint: Color(0xFF3A6B86),
    zones: [
      Zone(
        id: 'z_grand',
        nameMn: 'Гранд индэр',
        nameEn: 'Grandstand',
        descMn: 'Тайзны хамгийн сайн харагдах',
        descEn: 'Best view of the stage',
        price: 120000,
        capacity: 1000,
        sold: 300,
        color: Color(0xFFC39A4E),
      ),
      Zone(
        id: 'z_standard',
        nameMn: 'Энгийн суудал',
        nameEn: 'Standard seating',
        descMn: 'Тайз бүтэн харагдана',
        descEn: 'Full stage view',
        price: 50000,
        capacity: 8000,
        sold: 1200,
        color: Color(0xFF2F6E8F),
      ),
    ],
  ),
  Event(
    id: 'evt_loudshot',
    title: 'LOUD SHOT — Super Concert',
    subtitleMn: 'Jay Park · Jessi · ба зочид',
    subtitleEn: 'Jay Park · Jessi · & guests',
    startsAt: DateTime(2026, 6, 20, 20, 0),
    venue: 'Цэнгэлдэх хүрээлэн · National Stadium',
    descriptionMn:
        'Олон улсын "Super Concert" Улаанбаатарт буух нь — Jay Park, Jessi '
        'нар тэргүүлнэ. 3-р шат идэвхжсэн.',
    descriptionEn:
        'The Super Concert lands in Ulaanbaatar — an international lineup '
        'headlined by Jay Park and Jessi. Phase 3 now active.',
    image: 'assets/events/loudshot.png',
    icon: Icons.bolt_rounded,
    tint: Color(0xFF2563EB),
    zones: [
      Zone(
        id: 'z_vip',
        nameMn: _vipMn,
        nameEn: _vipEn,
        descMn: 'Тайзанд хамгийн ойр · ширээтэй · үйлчилгээтэй',
        descEn: 'Closest to stage · seated tables · service',
        price: 320000,
        capacity: 200,
        sold: 150,
        color: Color(0xFFC39A4E),
      ),
      Zone(
        id: 'z_premium',
        nameMn: 'Premium зогсох',
        nameEn: 'Premium standing',
        descMn: 'Урд зогсох талбай',
        descEn: 'Front standing pit',
        price: 190000,
        capacity: 1500,
        sold: 1290,
        color: Color(0xFFB05A3C),
      ),
      Zone(
        id: 'z_general',
        nameMn: 'Энгийн тасалбар',
        nameEn: 'General admission',
        descMn: 'Талбай ба индэр',
        descEn: 'Stadium floor & stands',
        price: 90000,
        capacity: 5000,
        sold: 2100,
        color: Color(0xFF2563EB),
      ),
    ],
  ),
];
