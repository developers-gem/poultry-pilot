import 'dart:ui';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// The soft colour blobs behind every screen (as on the web app).
class Backdrop extends StatelessWidget {
  const Backdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    Widget blob(Color c, double size) => Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: c));
    return Stack(
      children: [
        const Positioned.fill(child: ColoredBox(color: AppColors.background)),
        Positioned.fill(
          child: ImageFiltered(
            imageFilter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
            child: Stack(
              children: [
                Positioned(top: -120, left: -100, child: blob(AppColors.brand.withValues(alpha: 0.28), 340)),
                Positioned(top: 120, right: -140, child: blob(AppColors.accent.withValues(alpha: 0.20), 360)),
                Positioned(bottom: -60, left: 40, child: blob(AppColors.cyan.withValues(alpha: 0.22), 320)),
              ],
            ),
          ),
        ),
        Positioned.fill(child: child),
      ],
    );
  }
}

/// A frosted "prism glass" card with the rainbow edge.
class GlassCard extends StatelessWidget {
  const GlassCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(AppTheme.radius + 4);
    return Container(
      decoration: BoxDecoration(borderRadius: radius, gradient: const LinearGradient(colors: AppColors.prism, begin: Alignment.topLeft, end: Alignment.bottomRight)),
      padding: const EdgeInsets.all(1),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
          child: Material(
            color: Colors.white.withValues(alpha: 0.72),
            child: InkWell(onTap: onTap, child: Padding(padding: padding, child: child)),
          ),
        ),
      ),
    );
  }
}

/// "PP" mark and wordmark.
class BrandLogo extends StatelessWidget {
  const BrandLogo({super.key, this.subtitle = 'Flock OS', this.size = 40});

  final String subtitle;
  final double size;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(size * 0.3)),
          child: Text('PP', style: t.titleMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
        ),
        const SizedBox(width: 10),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Poultry Pilot', style: t.titleMedium?.copyWith(height: 1)),
              Text(subtitle.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: t.labelSmall?.copyWith(color: AppColors.inkSoft, letterSpacing: 1.6)),
            ],
          ),
        ),
      ],
    );
  }
}

/// Small uppercase label above a title, as on the web screens.
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.inkSoft, letterSpacing: 2));
}

enum Tone { mint, rose, amber, cyan, brand }

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.tone = Tone.mint});

  final String text;
  final Tone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      Tone.mint => (AppColors.mint, AppColors.mintInk),
      Tone.rose => (AppColors.rose, AppColors.roseInk),
      Tone.amber => (AppColors.amber, AppColors.amberInk),
      Tone.cyan => (AppColors.cyan, AppColors.cyanInk),
      Tone.brand => (AppColors.brand, AppColors.brandInk),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(99)),
      child: Text(text, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: fg, fontWeight: FontWeight.w700)),
    );
  }
}

/// A stat card: label, big value, optional badge and hint (the web dashboard's stat tile).
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, this.badge, this.badgeTone = Tone.mint, this.hint});

  final String label;
  final String value;
  final String? badge;
  final Tone badgeTone;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return GlassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(label, style: t.labelMedium?.copyWith(color: AppColors.inkSoft))),
            if (badge != null) Pill(badge!, tone: badgeTone),
          ]),
          const SizedBox(height: 10),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: t.headlineSmall)),
          if (hint != null) ...[
            const SizedBox(height: 6),
            Text(hint!, maxLines: 2, overflow: TextOverflow.ellipsis, style: t.bodySmall?.copyWith(color: AppColors.inkSoft)),
          ],
        ],
      ),
    );
  }
}
