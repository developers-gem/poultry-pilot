import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/glass.dart';

/// The centred glass card on the backdrop that every sign-in screen uses (as on the web's /auth page).
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.title, required this.child, this.showBack = false});

  final String title;
  final Widget child;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: showBack ? AppBar() : null,
      extendBodyBehindAppBar: true,
      body: Backdrop(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: GlassCard(
                  padding: const EdgeInsets.all(22),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    const Eyebrow('PoultryPilot'),
                    const SizedBox(height: 4),
                    Text(title, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 18),
                    child,
                  ]),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class FormBanner extends StatelessWidget {
  const FormBanner(this.text, {super.key, this.success = false});

  final String text;
  final bool success;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: (success ? AppColors.mint : AppColors.rose).withValues(alpha: 0.14), borderRadius: BorderRadius.circular(AppTheme.radius)),
        child: Text(text, style: TextStyle(color: success ? AppColors.mintInk : AppColors.roseInk)),
      );
}

class SubmitButton extends StatelessWidget {
  const SubmitButton({super.key, required this.label, required this.busy, required this.onPressed});

  final String label;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => FilledButton(
        onPressed: busy ? null : onPressed,
        child: busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(label),
      );
}

String? requiredText(String? v, String what) => (v == null || v.trim().isEmpty) ? 'Enter $what' : null;
String? emailText(String? v) => (v == null || !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())) ? 'Enter a valid email address' : null;

/// The API's password rule, checked before sending (the API checks it again).
String? newPasswordText(String? v) {
  if (v == null || v.length < 10) return 'Use at least 10 characters';
  if (!RegExp(r'[A-Za-z]').hasMatch(v) || !RegExp(r'\d').hasMatch(v)) return 'Use letters and at least one number';
  return null;
}
