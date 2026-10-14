import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error/app_exception.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../auth/auth_widgets.dart';
import '../session/session_controller.dart';
import 'profile_view_model.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _profileForm = GlobalKey<FormState>();
  final _passwordForm = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _phone;
  final _current = TextEditingController();
  final _next = TextEditingController();
  bool _savingProfile = false;
  bool _savingPassword = false;
  Map<String, String> _fieldErrors = const {};

  @override
  void initState() {
    super.initState();
    final s = ref.read(sessionProvider);
    final user = s is SessionSignedIn ? s.account.user : null;
    _name = TextEditingController(text: user?.fullName ?? '');
    _phone = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _current, _next]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, String success, void Function(bool) busy) async {
    busy(true);
    setState(() => _fieldErrors = const {});
    try {
      await action();
      if (mounted) showMessage(context, success);
    } on AppException catch (e) {
      setState(() => _fieldErrors = e.fieldErrors);
      if (mounted && e.fieldErrors.isEmpty) showError(context, e);
    } finally {
      busy(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(sessionProvider);
    if (s is! SessionSignedIn) return const SizedBox.shrink();
    final user = s.account.user;
    final vm = ref.watch(profileViewModelProvider);
    final sessions = ref.watch(sessionsProvider);
    final t = Theme.of(context).textTheme;
    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
      const Eyebrow('Your account'),
      Text(user.fullName, style: t.headlineSmall),
      Text(user.email, style: t.bodyMedium?.copyWith(color: AppColors.inkSoft)),
      const SizedBox(height: 14),
      if (!user.emailVerified)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GlassCard(
            child: Row(children: [
              const Icon(Icons.mark_email_unread_outlined, color: AppColors.amberInk),
              const SizedBox(width: 10),
              const Expanded(child: Text('Confirm your email to invite people and receive alerts by email.')),
              TextButton(onPressed: () => _run(vm.resendVerification, 'Confirmation email sent', (_) {}), child: const Text('Resend')),
            ]),
          ),
        ),
      GlassCard(
        child: Form(
          key: _profileForm,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Text('Your details', style: t.titleMedium),
            const SizedBox(height: 12),
            TextFormField(controller: _name, decoration: InputDecoration(labelText: 'Name', errorText: _fieldErrors['fullName']), textCapitalization: TextCapitalization.words, validator: (v) => requiredText(v, 'your name')),
            const SizedBox(height: 12),
            TextFormField(controller: _phone, decoration: InputDecoration(labelText: 'Phone', helperText: 'Shared with buyers only after you accept their order', errorText: _fieldErrors['phone']), keyboardType: TextInputType.phone),
            const SizedBox(height: 14),
            SubmitButton(label: 'Save my details', busy: _savingProfile, onPressed: () {
              if (_profileForm.currentState!.validate()) _run(() => vm.saveProfile(_name.text, _phone.text), 'Your details are saved', (b) => setState(() => _savingProfile = b));
            }),
          ]),
        ),
      ),
      if (user.hasPassword) ...[
        const SizedBox(height: 12),
        GlassCard(
          child: Form(
            key: _passwordForm,
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('Change password', style: t.titleMedium),
              const SizedBox(height: 12),
              TextFormField(controller: _current, obscureText: true, decoration: InputDecoration(labelText: 'Current password', errorText: _fieldErrors['currentPassword']), validator: (v) => requiredText(v, 'your current password')),
              const SizedBox(height: 12),
              TextFormField(controller: _next, obscureText: true, decoration: InputDecoration(labelText: 'New password', helperText: 'At least 10 characters, with letters and a number', errorText: _fieldErrors['newPassword']), validator: newPasswordText),
              const SizedBox(height: 14),
              SubmitButton(label: 'Change password', busy: _savingPassword, onPressed: () {
                if (!_passwordForm.currentState!.validate()) return;
                _run(() async {
                  await vm.changePassword(_current.text, _next.text);
                  _current.clear();
                  _next.clear();
                }, 'Password changed. Other devices were signed out.', (b) => setState(() => _savingPassword = b));
              }),
            ]),
          ),
        ),
      ],
      const SizedBox(height: 12),
      GlassCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Signed-in devices', style: t.titleMedium),
          const SizedBox(height: 8),
          sessions.when(
            loading: () => const Padding(padding: EdgeInsets.all(12), child: LoadingView()),
            error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(sessionsProvider)),
            data: (list) => Column(children: [
              for (final d in list)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(d.platform == 'web' ? Icons.laptop_outlined : Icons.phone_android_outlined),
                  title: Text(d.deviceName ?? Fmt.label(d.platform)),
                  subtitle: Text(d.current ? 'This device' : 'Last used ${Fmt.dateTime(d.lastUsedAt)}'),
                  trailing: d.current ? null : TextButton(onPressed: () => _run(() => vm.revoke(d.id), 'Device signed out', (_) {}), child: const Text('Sign out')),
                ),
              if (list.where((d) => !d.current).isNotEmpty)
                Align(alignment: Alignment.centerLeft, child: TextButton(onPressed: () => _run(vm.revokeOthers, 'Other devices signed out', (_) {}), child: const Text('Sign out all other devices'))),
            ]),
          ),
        ]),
      ),
    ]);
  }
}
