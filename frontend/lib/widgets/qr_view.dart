import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../theme/app_colors.dart';

/// A real, **scannable** QR code framed to match the kiosk's look
/// (gradient border + neon glow around a bright white QR card).
///
/// Unlike [QrPlaceholder] this renders an actual QR from [data], so a customer
/// can scan it with their phone — used for the digital entry ticket and the
/// И-Баримт fiscal receipt on the confirmation screen.
class QrView extends StatelessWidget {
  final String data;
  final double size;
  final Color foreground;
  final Color background;

  const QrView({
    super.key,
    required this.data,
    this.size = 220,
    this.foreground = const Color(0xFF1C1B17),
    this.background = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(size * 0.035),
      decoration: BoxDecoration(
        gradient: AppColors.brand,
        borderRadius: BorderRadius.circular(size * 0.10),
        boxShadow: [
          BoxShadow(
            color: AppColors.magenta.withValues(alpha: 0.4),
            blurRadius: 30,
            spreadRadius: -4,
          ),
        ],
      ),
      child: Container(
        width: size,
        height: size,
        padding: EdgeInsets.all(size * 0.08),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(size * 0.07),
        ),
        child: QrImageView(
          data: data,
          version: QrVersions.auto,
          // Medium error correction tolerates a phone snapping a photo of the
          // screen at an angle / with glare.
          errorCorrectionLevel: QrErrorCorrectLevel.M,
          backgroundColor: background,
          eyeStyle: QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: foreground,
          ),
          dataModuleStyle: QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: foreground,
          ),
        ),
      ),
    );
  }
}
