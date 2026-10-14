import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import 'auth_view_model.dart';
import 'auth_widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _hide = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_form.currentState!.validate()) return;
    ref.read(authViewModelProvider.notifier).login(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(authViewModelProvider);
    return AuthScaffold(
      title: 'Sign in to your farm',
      child: Form(
        key: _form,
        child: AutofillGroup(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (s.banner != null) FormBanner(s.banner!),
            TextFormField(
              controller: _email,
              decoration: InputDecoration(labelText: 'Email', errorText: s.field('email')),
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              validator: emailText,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _password,
              obscureText: _hide,
              decoration: InputDecoration(
                labelText: 'Password',
                errorText: s.field('password'),
                suffixIcon: IconButton(tooltip: _hide ? 'Show password' : 'Hide password', icon: Icon(_hide ? Icons.visibility_outlined : Icons.visibility_off_outlined), onPressed: () => setState(() => _hide = !_hide)),
              ),
              autofillHints: const [AutofillHints.password],
              onFieldSubmitted: (_) => _submit(),
              validator: (v) => requiredText(v, 'your password'),
            ),
            const SizedBox(height: 18),
            SubmitButton(label: 'Sign in', busy: s.submitting, onPressed: _submit),
            const SizedBox(height: 8),
            TextButton(onPressed: () => context.push(Routes.forgotPassword), child: const Text('Forgot your password?')),
            TextButton(onPressed: () => context.go(Routes.signup), child: const Text('New here? Create a farm account')),
          ]),
        ),
      ),
    );
  }
}
