import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/error/app_exception.dart';
import '../../core/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/states.dart';
import '../auth/auth_view_model.dart';
import '../session/session_controller.dart';

/// View model: create a farm (and select it). Choosing an existing farm goes straight to the session.
class FarmSelectionViewModel extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  Future<bool> create(String name, String currency) async {
    state = const AsyncLoading();
    try {
      final farm = await ref.read(farmRepositoryProvider).createFarm(name: name, currency: currency, timezone: await deviceTimezone());
      await ref.read(sessionProvider.notifier).reloadAccount(selectFarm: farm.id);
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }
}

final farmSelectionViewModelProvider = NotifierProvider.autoDispose<FarmSelectionViewModel, AsyncValue<void>>(FarmSelectionViewModel.new);

class FarmSelectionScreen extends ConsumerStatefulWidget {
  const FarmSelectionScreen({super.key});

  @override
  ConsumerState<FarmSelectionScreen> createState() => _FarmSelectionScreenState();
}

class _FarmSelectionScreenState extends ConsumerState<FarmSelectionScreen> {
  final _name = TextEditingController();
  String _currency = 'INR';
  bool _creating = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final vm = ref.watch(farmSelectionViewModelProvider);
    final account = session is SessionSignedIn ? session.account : null;
    final farms = account?.memberships ?? const [];
    final t = Theme.of(context).textTheme;
    final createError = vm.error;
    return Scaffold(
      body: Backdrop(
        child: SafeArea(
          child: ListView(padding: const EdgeInsets.all(20), children: [
            const BrandLogo(),
            const SizedBox(height: 24),
            const Eyebrow('Choose a farm'),
            const SizedBox(height: 4),
            Text(account == null ? 'Your farms' : 'Hello, ${account.user.fullName.split(' ').first}', style: t.headlineSmall),
            const SizedBox(height: 4),
            Text(farms.isEmpty ? 'You are not on a farm yet. Create one to start.' : 'Pick the farm to work on. You can switch any time in Settings.', style: t.bodyMedium?.copyWith(color: AppColors.inkSoft)),
            const SizedBox(height: 18),
            for (final m in farms) ...[
              GlassCard(
                onTap: () => ref.read(sessionProvider.notifier).selectFarm(m.farmId),
                child: Row(children: [
                  Container(width: 40, height: 40, alignment: Alignment.center, decoration: BoxDecoration(color: AppColors.brand.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.agriculture_outlined, color: AppColors.brandInk)),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(m.farmName, style: t.titleMedium), Text(Fmt.label(m.role), style: t.bodySmall?.copyWith(color: AppColors.inkSoft))])),
                  const Icon(Icons.chevron_right, color: AppColors.inkSoft),
                ]),
              ),
              const SizedBox(height: 10),
            ],
            const SizedBox(height: 8),
            GlassCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                InkWell(
                  onTap: () => setState(() => _creating = !_creating),
                  child: Row(children: [Expanded(child: Text('Create a farm', style: t.titleMedium)), Text(_creating ? 'Close' : 'Open', style: const TextStyle(color: AppColors.inkSoft))]),
                ),
                if (_creating || farms.isEmpty) ...[
                  const SizedBox(height: 14),
                  if (createError != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text(createError is AppException ? createError.userMessage : 'Could not create the farm.', style: const TextStyle(color: AppColors.roseInk))),
                  TextField(controller: _name, decoration: InputDecoration(labelText: 'Farm name', errorText: createError is AppException ? createError.fieldErrors['name'] : null), textCapitalization: TextCapitalization.words),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(value: _currency, decoration: const InputDecoration(labelText: 'Currency'), items: [for (final c in currencies) DropdownMenuItem(value: c, child: Text(c))], onChanged: (v) => setState(() => _currency = v ?? _currency)),
                  const SizedBox(height: 14),
                  FilledButton(
                    onPressed: vm.isLoading ? null : () async {
                      if (_name.text.trim().isEmpty) {
                        showMessage(context, 'Enter the farm name');
                        return;
                      }
                      await ref.read(farmSelectionViewModelProvider.notifier).create(_name.text, _currency);
                    },
                    child: vm.isLoading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Create farm'),
                  ),
                ],
              ]),
            ),
            const SizedBox(height: 18),
            TextButton(onPressed: () => ref.read(sessionProvider.notifier).logout(), child: const Text('Sign out')),
          ]),
        ),
      ),
    );
  }
}
