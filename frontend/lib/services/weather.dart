import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

/// Current weather for a location, mapped to a temperature, an icon, a tint
/// colour and a localized label.
class Weather {
  final int tempC;
  final IconData icon;
  final Color tint;
  final String Function(bool mn) label;
  const Weather({
    required this.tempC,
    required this.icon,
    required this.tint,
    required this.label,
  });
}

/// Fetches live current weather for **Ulaanbaatar** from Open-Meteo
/// (free, no API key). Returns null on any failure so callers can fall back
/// gracefully — a kiosk should never show an error for this.
class WeatherService {
  WeatherService._();

  // Ulaanbaatar, Mongolia.
  static const _lat = 47.9187;
  static const _lon = 106.9176;

  // Pleasant, condition-appropriate tints — deep enough to read on the light
  // paper badge (warm sun → cool precipitation).
  static const _sun = Color(0xFFD8941C); // amber gold
  static const _warmCloud = Color(0xFFC2863A); // hazy sun
  static const _cloud = Color(0xFF6E7BA0); // slate-lavender
  static const _rain = Color(0xFF2E86C8); // sky blue
  static const _snow = Color(0xFF3F9CC4); // icy blue
  static const _storm = Color(0xFF6E54C6); // violet

  static Future<Weather?> fetchUlaanbaatar() async {
    final uri = Uri.parse(
      'https://api.open-meteo.com/v1/forecast'
      '?latitude=$_lat&longitude=$_lon&current=temperature_2m,weather_code',
    );
    try {
      final res = await http.get(uri).timeout(const Duration(seconds: 6));
      if (res.statusCode != 200) return null;
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final current = json['current'] as Map<String, dynamic>?;
      if (current == null) return null;
      final temp = (current['temperature_2m'] as num?)?.round();
      final code = (current['weather_code'] as num?)?.toInt();
      if (temp == null || code == null) return null;
      final c = _condition(code);
      return Weather(tempC: temp, icon: c.$1, tint: c.$2, label: c.$3);
    } catch (_) {
      return null; // offline / DNS / parse — fall back silently
    }
  }

  /// Maps a WMO weather code to a Material icon, a tint and a localized label.
  static (IconData, Color, String Function(bool)) _condition(int code) {
    if (code == 0) {
      return (Icons.wb_sunny_rounded, _sun, (mn) => mn ? 'Цэлмэг' : 'Clear');
    }
    if (code <= 2) {
      return (Icons.wb_cloudy_rounded, _warmCloud, (mn) => mn ? 'Багавтар үүлтэй' : 'Partly cloudy');
    }
    if (code == 3) {
      return (Icons.cloud_rounded, _cloud, (mn) => mn ? 'Үүлэрхэг' : 'Cloudy');
    }
    if (code == 45 || code == 48) {
      return (Icons.foggy, _cloud, (mn) => mn ? 'Манантай' : 'Fog');
    }
    if (code >= 51 && code <= 67) {
      return (Icons.grain_rounded, _rain, (mn) => mn ? 'Бороотой' : 'Rain');
    }
    if (code >= 71 && code <= 77) {
      return (Icons.ac_unit_rounded, _snow, (mn) => mn ? 'Цастай' : 'Snow');
    }
    if (code >= 80 && code <= 82) {
      return (Icons.water_drop_rounded, _rain, (mn) => mn ? 'Аадар бороо' : 'Showers');
    }
    if (code == 85 || code == 86) {
      return (Icons.ac_unit_rounded, _snow, (mn) => mn ? 'Цас орно' : 'Snow showers');
    }
    if (code >= 95) {
      return (Icons.thunderstorm_rounded, _storm, (mn) => mn ? 'Аянга цахилгаан' : 'Thunderstorm');
    }
    // Default
    return (Icons.cloud_rounded, _cloud, (mn) => mn ? 'Үүлэрхэг' : 'Cloudy');
  }
}
