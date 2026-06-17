import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/creator_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late TextEditingController _urlCtrl;
  late TextEditingController _tokenCtrl;

  @override
  void initState() {
    super.initState();
    final api = ref.read(apiServiceProvider);
    _urlCtrl = TextEditingController(text: api.baseUrl);
    _tokenCtrl = TextEditingController(text: api.token ?? '');
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _tokenCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final api = ref.read(apiServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _urlCtrl,
              decoration: const InputDecoration(
                labelText: 'API Base URL',
                hintText: 'http://localhost:8080',
              ),
              keyboardType: TextInputType.url,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _tokenCtrl,
              decoration: const InputDecoration(
                labelText: 'Auth Token (Clerk JWT)',
                hintText: 'Bearer token from web app',
              ),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () async {
                final saved = api.setBaseUrl(_urlCtrl.text.trim());
                final tokenSaved = api.setToken(_tokenCtrl.text.trim());
                await saved;
                await tokenSaved;
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Saved')),
                );
              },
              child: const Text('Save'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                try {
                  final me = await api.getMe();
                  if (!mounted) return;
                  messenger.showSnackBar(
                    SnackBar(content: Text('Authenticated as: ${me['username'] ?? me['id']}')),
                  );
                } catch (e) {
                  if (!mounted) return;
                  messenger.showSnackBar(
                    SnackBar(content: Text('Auth check failed: $e')),
                  );
                }
              },
              child: const Text('Test Authentication'),
            ),
          ],
        ),
      ),
    );
  }
}
