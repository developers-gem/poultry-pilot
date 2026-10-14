import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../connectivity/connectivity.dart';
import '../error/app_exception.dart';
import '../theme/app_theme.dart';
import 'glass.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.message});

  final String? message;

  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const CircularProgressIndicator(color: AppColors.brand),
          if (message != null) ...[const SizedBox(height: 12), Text(message!, style: const TextStyle(color: AppColors.inkSoft))],
        ]),
      );
}

/// Skeleton blocks while a screen's first data loads.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.count = 4});

  final int count;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        child: Column(
          children: List.generate(
            count,
            (_) => Container(height: 96, margin: const EdgeInsets.only(bottom: 12), decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(AppTheme.radius + 4))),
          ),
        ),
      );
}

class EmptyView extends StatelessWidget {
  const EmptyView({super.key, required this.title, this.body, this.action});

  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(children: [
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleSmall),
          if (body != null) ...[const SizedBox(height: 6), Text(body!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkSoft))],
          if (action != null) ...[const SizedBox(height: 14), action!],
        ]),
      );
}

/// An error with the server's message, its reference for support and a retry.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, this.onRetry});

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final e = error is AppException ? error as AppException : null;
    return GlassCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(e?.userMessage ?? 'Something went wrong.', style: const TextStyle(color: AppColors.roseInk, fontWeight: FontWeight.w600)),
        if (e?.requestId != null) ...[const SizedBox(height: 4), Text('Reference ${e!.requestId}', style: const TextStyle(color: AppColors.inkSoft, fontSize: 12))],
        if (onRetry != null && !(e?.isForbidden ?? false)) ...[const SizedBox(height: 12), OutlinedButton(onPressed: onRetry, child: const Text('Try again'))],
      ]),
    );
  }
}

/// Shown while offline: screens keep showing what was last loaded; saving waits for a connection.
class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final online = ref.watch(isOnlineProvider).valueOrNull ?? true;
    if (online) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: AppColors.amber.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(AppTheme.radius)),
      child: const Text.rich(
        TextSpan(children: [
          TextSpan(text: "You're offline. ", style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.amberInk)),
          TextSpan(text: "You're seeing the last data loaded; saving waits until you reconnect.", style: TextStyle(color: AppColors.inkSoft)),
        ]),
      ),
    );
  }
}

/// Shows an error from a failed action as a snackbar.
void showError(BuildContext context, Object error) {
  final msg = error is AppException ? error.userMessage : 'Something went wrong.';
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: AppColors.roseInk));
}

void showMessage(BuildContext context, String text) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
