import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../session/session_controller.dart';

/// Starts the app: onboarding once, then restores the stored session. The router moves on when it is decided.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (ref.read(sessionProvider) is SessionStarting) ref.read(sessionProvider.notifier).start();
    });
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider);
    return Scaffold(
      body: Backdrop(
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const BrandLogo(size: 56),
                const SizedBox(height: 32),
                if (s is SessionStartFailed)
                  ErrorView(error: s.error, onRetry: () => ref.read(sessionProvider.notifier).start())
                else
                  const LoadingView(message: 'Opening your farm…'),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
