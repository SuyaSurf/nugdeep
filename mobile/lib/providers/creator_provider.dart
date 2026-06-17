import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/puzzle.dart';
import '../models/community.dart';
import '../services/api_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) {
  final svc = ApiService();
  svc.loadConfig();
  return svc;
});

final categoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  final api = ref.read(apiServiceProvider);
  return api.listCategories();
});

final puzzleBuilderProvider = StateNotifierProvider<PuzzleBuilderNotifier, PuzzleBuilderState>((ref) {
  return PuzzleBuilderNotifier();
});

class PuzzleBuilderState {
  final List<String> categories;
  final List<PuzzleWord> words;
  final int difficulty;
  final int timerSeconds;
  final bool isSubmitting;
  final String? error;
  final Puzzle? createdPuzzle;

  PuzzleBuilderState({
    this.categories = const [],
    this.words = const [],
    this.difficulty = 1,
    this.timerSeconds = 50,
    this.isSubmitting = false,
    this.error,
    this.createdPuzzle,
  });

  PuzzleBuilderState copyWith({
    List<String>? categories,
    List<PuzzleWord>? words,
    int? difficulty,
    int? timerSeconds,
    bool? isSubmitting,
    String? error,
    Puzzle? createdPuzzle,
  }) => PuzzleBuilderState(
    categories: categories ?? this.categories,
    words: words ?? this.words,
    difficulty: difficulty ?? this.difficulty,
    timerSeconds: timerSeconds ?? this.timerSeconds,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    error: error,
    createdPuzzle: createdPuzzle ?? this.createdPuzzle,
  );
}

class PuzzleBuilderNotifier extends StateNotifier<PuzzleBuilderState> {
  PuzzleBuilderNotifier() : super(PuzzleBuilderState());

  void setCategories(List<String> cats) => state = state.copyWith(categories: cats);
  void setDifficulty(int d) => state = state.copyWith(difficulty: d);
  void setTimer(int t) => state = state.copyWith(timerSeconds: t);

  void addWord(PuzzleWord word) {
    state = state.copyWith(words: [...state.words, word]);
  }

  void removeWord(int index) {
    final words = [...state.words];
    words.removeAt(index);
    state = state.copyWith(words: words);
  }

  void clearError() => state = state.copyWith(error: null);

  Future<void> submit(ApiService api) async {
    if (state.words.isEmpty) {
      state = state.copyWith(error: 'Add at least one word');
      return;
    }
    state = state.copyWith(isSubmitting: true, error: null);
    try {
      final puzzle = Puzzle(
        categoryIds: state.categories,
        difficulty: state.difficulty,
        timerSeconds: state.timerSeconds,
        wordSet: state.words,
      );
      final created = await api.createPuzzle(puzzle);
      state = state.copyWith(isSubmitting: false, createdPuzzle: created);
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: e.toString());
    }
  }
}

final communityBuilderProvider = StateNotifierProvider<CommunityBuilderNotifier, CommunityBuilderState>((ref) {
  return CommunityBuilderNotifier();
});

class CommunityBuilderState {
  final String slug;
  final String name;
  final String description;
  final String hint;
  final String? puzzleId;
  final int? maxMembers;
  final bool hidden;
  final bool isSubmitting;
  final String? error;
  final Community? createdCommunity;

  CommunityBuilderState({
    this.slug = '',
    this.name = '',
    this.description = '',
    this.hint = '',
    this.puzzleId,
    this.maxMembers,
    this.hidden = true,
    this.isSubmitting = false,
    this.error,
    this.createdCommunity,
  });

  CommunityBuilderState copyWith({
    String? slug,
    String? name,
    String? description,
    String? hint,
    String? puzzleId,
    int? maxMembers,
    bool? hidden,
    bool? isSubmitting,
    String? error,
    Community? createdCommunity,
  }) => CommunityBuilderState(
    slug: slug ?? this.slug,
    name: name ?? this.name,
    description: description ?? this.description,
    hint: hint ?? this.hint,
    puzzleId: puzzleId ?? this.puzzleId,
    maxMembers: maxMembers ?? this.maxMembers,
    hidden: hidden ?? this.hidden,
    isSubmitting: isSubmitting ?? this.isSubmitting,
    error: error,
    createdCommunity: createdCommunity ?? this.createdCommunity,
  );
}

class CommunityBuilderNotifier extends StateNotifier<CommunityBuilderState> {
  CommunityBuilderNotifier() : super(CommunityBuilderState());

  void setSlug(String v) => state = state.copyWith(slug: v);
  void setName(String v) => state = state.copyWith(name: v);
  void setDescription(String v) => state = state.copyWith(description: v);
  void setHint(String v) => state = state.copyWith(hint: v);
  void setPuzzleId(String? v) => state = state.copyWith(puzzleId: v);
  void setMaxMembers(int? v) => state = state.copyWith(maxMembers: v);
  void setHidden(bool v) => state = state.copyWith(hidden: v);
  void clearError() => state = state.copyWith(error: null);

  Future<void> submit(ApiService api) async {
    if (state.slug.isEmpty || state.name.isEmpty) {
      state = state.copyWith(error: 'Slug and name are required');
      return;
    }
    state = state.copyWith(isSubmitting: true, error: null);
    try {
      final community = Community(
        slug: state.slug,
        name: state.name,
        description: state.description,
        hint: state.hint,
        puzzleId: state.puzzleId,
        maxMembers: state.maxMembers,
        hidden: state.hidden,
      );
      final created = await api.createCommunity(community);
      state = state.copyWith(isSubmitting: false, createdCommunity: created);
    } catch (e) {
      state = state.copyWith(isSubmitting: false, error: e.toString());
    }
  }
}
