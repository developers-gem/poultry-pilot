import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/glass.dart';
import '../session/session_controller.dart';

/// First launch only: what PoultryPilot does (product copy, not farm data).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final _pages = PageController();
  int _index = 0;

  static const _content = [
    (icon: Icons.egg_outlined, title: 'Every bird, egg and bag of feed accounted for', body: "Record the day's eggs, feed and losses in seconds, on the farm, even with a weak signal."),
    (icon: Icons.insights_outlined, title: 'See how each batch is really doing', body: 'Weight gain, feed conversion, costs and profit for every flock, worked out from your own records.'),
    (icon: Icons.notifications_active_outlined, title: 'Know when something changes', body: "Warnings when eggs fall, deaths rise or feed use shifts, judged against your farm's own normal."),
  ];

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _finish() => ref.read(sessionProvider.notifier).finishOnboarding();

  @override
  Widget build(BuildContext context) {
    final last = _index == _content.length - 1;
    final t = Theme.of(context).textTheme;
    return Scaffold(
      body: Backdrop(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              Row(children: [const BrandLogo(), const Spacer(), TextButton(onPressed: _finish, child: const Text('Skip'))]),
              Expanded(
                child: PageView.builder(
                  controller: _pages,
                  itemCount: _content.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) {
                    final c = _content[i];
                    return Center(
                      child: GlassCard(
                        padding: const EdgeInsets.all(24),
                        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Icon(c.icon, size: 40, color: AppColors.brand),
                          const SizedBox(height: 16),
                          Text(c.title, style: t.headlineSmall),
                          const SizedBox(height: 10),
                          Text(c.body, style: t.bodyLarge?.copyWith(color: AppColors.inkSoft)),
                        ]),
                      ),
                    );
                  },
                ),
              ),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (var i = 0; i < _content.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.all(4),
                    width: i == _index ? 22 : 8,
                    height: 8,
                    decoration: BoxDecoration(color: i == _index ? AppColors.ink : AppColors.line, borderRadius: BorderRadius.circular(8)),
                  ),
              ]),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: last ? _finish : () => _pages.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeOut),
                child: Text(last ? 'Get started' : 'Next'),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}
