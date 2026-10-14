import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import 'auth_view_model.dart';
import 'auth_widgets.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(authViewModelProvider);
    return AuthScaffold(
      title: 'Reset your password',
      showBack: true,
      child: Form(
        key: _form,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (s.done)
            // The API answers the same whether or not the email has an account (no account discovery).
            const FormBanner('If that email has an account, a reset link is on its way. Open it on this phone or any browser.', success: true),
          if (s.banner != null) FormBanner(s.banner!),
          const Text("Enter your account's email and we'll send a link to choose a new password."),
          const SizedBox(height: 14),
          TextFormField(controller: _email, decoration: InputDecoration(labelText: 'Email', errorText: s.field('email')), keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], validator: emailText),
          const SizedBox(height: 18),
          SubmitButton(label: 'Send reset link', busy: s.submitting, onPressed: () {
            if (_form.currentState!.validate()) ref.read(authViewModelProvider.notifier).forgotPassword(_email.text);
          }),
          const SizedBox(height: 8),
          TextButton(onPressed: () => context.go(Routes.login), child: const Text('Back to sign in')),
        ]),
      ),
    );
  }
}
