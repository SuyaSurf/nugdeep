class PuzzleWord {
  final String word;
  final String correctCategory;
  final List<String> decoys;

  PuzzleWord({
    required this.word,
    required this.correctCategory,
    required this.decoys,
  });

  Map<String, dynamic> toJson() => {
    'word': word,
    'correct_category': correctCategory,
    'decoys': decoys,
  };

  factory PuzzleWord.fromJson(Map<String, dynamic> json) => PuzzleWord(
    word: json['word'] as String,
    correctCategory: json['correct_category'] as String,
    decoys: List<String>.from(json['decoys'] as List),
  );
}

class Puzzle {
  final String? id;
  final String? ownerId;
  final List<String> categoryIds;
  final int difficulty;
  final int timerSeconds;
  final List<PuzzleWord> wordSet;

  Puzzle({
    this.id,
    this.ownerId,
    required this.categoryIds,
    required this.difficulty,
    required this.timerSeconds,
    required this.wordSet,
  });

  Map<String, dynamic> toJson() => {
    'category_ids': categoryIds,
    'difficulty': difficulty,
    'timer_seconds': timerSeconds,
    'word_set': wordSet.map((w) => w.toJson()).toList(),
  };

  factory Puzzle.fromJson(Map<String, dynamic> json) => Puzzle(
    id: json['id'] as String?,
    ownerId: json['owner_id'] as String?,
    categoryIds: List<String>.from(json['category_ids'] as List? ?? []),
    difficulty: json['difficulty'] as int? ?? 1,
    timerSeconds: json['timer_seconds'] as int? ?? 50,
    wordSet: (json['word_set'] as List? ?? [])
      .map((e) => PuzzleWord.fromJson(e as Map<String, dynamic>))
      .toList(),
  );
}
