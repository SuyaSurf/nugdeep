import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/creator_provider.dart';

class CreateCommunityScreen extends ConsumerWidget {
  const CreateCommunityScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(communityBuilderProvider);
    final notifier = ref.read(communityBuilderProvider.notifier);
    final api = ref.read(apiServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Community')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              decoration: const InputDecoration(labelText: 'Slug (unique URL ID)'),
              onChanged: notifier.setSlug,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Name'),
              onChanged: notifier.setName,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 3,
              onChanged: notifier.setDescription,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Hint for puzzle solvers'),
              onChanged: notifier.setHint,
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Puzzle ID (optional)'),
              onChanged: (v) => notifier.setPuzzleId(v.isEmpty ? null : v),
            ),
            const SizedBox(height: 12),
            TextField(
              decoration: const InputDecoration(labelText: 'Max Members (optional)'),
              keyboardType: TextInputType.number,
              onChanged: (v) => notifier.setMaxMembers(int.tryParse(v)),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              title: const Text('Hidden Community'),
              subtitle: const Text('Only discoverable by solving the puzzle'),
              value: state.hidden,
              onChanged: notifier.setHidden,
            ),
            const SizedBox(height: 24),
            if (state.error != null)
              Text(state.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            if (state.createdCommunity != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Created community: ${state.createdCommunity!.name}'),
              ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: state.isSubmitting
                  ? null
                  : () => notifier.submit(api),
              child: state.isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Create Community'),
            ),
          ],
        ),
      ),
    );
  }
}
