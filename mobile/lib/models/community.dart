class Community {
  final String? id;
  final String slug;
  final String name;
  final String description;
  final String hint;
  final String? iconUrl;
  final String? puzzleId;
  final int? maxMembers;
  final bool hidden;

  Community({
    this.id,
    required this.slug,
    required this.name,
    required this.description,
    required this.hint,
    this.iconUrl,
    this.puzzleId,
    this.maxMembers,
    this.hidden = true,
  });

  Map<String, dynamic> toJson() => {
    'slug': slug,
    'name': name,
    'description': description,
    'hint': hint,
    'icon_url': iconUrl,
    'puzzle_id': puzzleId,
    'max_members': maxMembers,
    'hidden': hidden,
  };

  factory Community.fromJson(Map<String, dynamic> json) => Community(
    id: json['id'] as String?,
    slug: json['slug'] as String,
    name: json['name'] as String,
    description: json['description'] as String,
    hint: json['hint'] as String,
    iconUrl: json['icon_url'] as String?,
    puzzleId: json['puzzle_id'] as String?,
    maxMembers: json['max_members'] as int?,
    hidden: json['hidden'] as bool? ?? true,
  );
}
