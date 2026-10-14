import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/router/app_router.dart';
import 'auth_view_model.dart';
import 'auth_widgets.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _farm = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _currency = 'INR';

  @override
  void dispose() {
    for (final c in [_name, _farm, _email, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  void _submit() {
    if (!_form.currentState!.validate()) return;
    ref.read(authViewModelProvider.notifier).register(fullName: _name.text, farmName: _farm.text, email: _email.text, password: _password.text, currency: _currency);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(authViewModelProvider);
    return AuthScaffold(
      title: 'Create your farm account',
      child: Form(
        key: _form,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (s.banner != null) FormBanner(s.banner!),
          TextFormField(controller: _name, decoration: InputDecoration(labelText: 'Your name', errorText: s.field('fullName')), autofillHints: const [AutofillHints.name], textCapitalization: TextCapitalization.words, validator: (v) => requiredText(v, 'your name')),
          const SizedBox(height: 12),
          TextFormField(controller: _farm, decoration: InputDecoration(labelText: 'Farm name', hintText: 'Green Valley Poultry', errorText: s.field('farm.name')), textCapitalization: TextCapitalization.words),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _currency,
            decoration: const InputDecoration(labelText: 'Currency', helperText: "Used for all money on this farm. Time zone comes from this phone."),
            items: [for (final c in currencies) DropdownMenuItem(value: c, child: Text(c))],
            onChanged: (v) => setState(() => _currency = v ?? _currency),
          ),
          const SizedBox(height: 12),
          TextFormField(controller: _email, decoration: InputDecoration(labelText: 'Email', errorText: s.field('email')), keyboardType: TextInputType.emailAddress, autofillHints: const [AutofillHints.email], validator: emailText),
          const SizedBox(height: 12),
          TextFormField(controller: _password, obscureText: true, decoration: InputDecoration(labelText: 'Password', helperText: 'At least 10 characters, with letters and a number', errorText: s.field('password')), autofillHints: const [AutofillHints.newPassword], validator: newPasswordText),
          const SizedBox(height: 18),
          SubmitButton(label: 'Create account', busy: s.submitting, onPressed: _submit),
          const SizedBox(height: 8),
          TextButton(onPressed: () => context.go(Routes.login), child: const Text('Already have an account? Sign in')),
        ]),
      ),
    );
  }
}
