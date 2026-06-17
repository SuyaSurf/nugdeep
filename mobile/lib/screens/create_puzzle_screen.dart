import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/puzzle.dart';
import '../providers/creator_provider.dart';

class CreatePuzzleScreen extends ConsumerWidget {
  const CreatePuzzleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(puzzleBuilderProvider);
    final notifier = ref.read(puzzleBuilderProvider.notifier);
    final api = ref.read(apiServiceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Puzzle')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SectionTitle('Difficulty'),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 1, label: Text('Easy')),
                ButtonSegment(value: 2, label: Text('Medium')),
                ButtonSegment(value: 3, label: Text('Hard')),
              ],
              selected: {state.difficulty},
              onSelectionChanged: (v) => notifier.setDifficulty(v.first),
            ),
            const SizedBox(height: 16),
            _SectionTitle('Timer'),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: state.timerSeconds.toDouble(),
                    min: 20,
                    max: 120,
                    divisions: 10,
                    label: '${state.timerSeconds}s',
                    onChanged: (v) => notifier.setTimer(v.toInt()),
                  ),
                ),
                Text('${state.timerSeconds}s'),
              ],
            ),
            const SizedBox(height: 16),
            _SectionTitle('Words (${state.words.length})'),
            if (state.words.isEmpty)
              const Text('No words added yet.', style: TextStyle(color: Colors.grey)),
            ...state.words.asMap().entries.map((e) => _WordCard(
              index: e.key,
              word: e.value,
              onDelete: () => notifier.removeWord(e.key),
            )),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () => _showAddWordDialog(context, notifier),
              icon: const Icon(Icons.add),
              label: const Text('Add Word'),
            ),
            const SizedBox(height: 24),
            if (state.error != null)
              Text(state.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            if (state.createdPuzzle != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('Created puzzle ID: ${state.createdPuzzle!.id}'),
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
                  : const Text('Submit Puzzle'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddWordDialog(BuildContext context, PuzzleBuilderNotifier notifier) {
    final wordCtrl = TextEditingController();
    final categoryCtrl = TextEditingController();
    final decoyCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Word'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: wordCtrl, decoration: const InputDecoration(labelText: 'Word')),
              TextField(controller: categoryCtrl, decoration: const InputDecoration(labelText: 'Correct Category')),
              TextField(
                controller: decoyCtrl,
                decoration: const InputDecoration(labelText: 'Decoys (comma-separated)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final decoys = decoyCtrl.text
                .split(',')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList();
              notifier.addWord(PuzzleWord(
                word: wordCtrl.text.trim(),
                correctCategory: categoryCtrl.text.trim(),
                decoys: decoys,
              ));
              Navigator.pop(ctx);
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: Theme.of(context).textTheme.titleSmall),
    );
  }
}

class _WordCard extends StatelessWidget {
  final int index;
  final PuzzleWord word;
  final VoidCallback onDelete;

  const _WordCard({required this.index, required this.word, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text('${index + 1}')),
        title: Text(word.word),
        subtitle: Text('Category: ${word.correctCategory}\nDecoys: ${word.decoys.join(", ")}'),
        trailing: IconButton(
          icon: const Icon(Icons.delete, color: Colors.red),
          onPressed: onDelete,
        ),
      ),
    );
  }
}
