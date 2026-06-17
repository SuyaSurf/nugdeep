CREATE TABLE categories (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);

INSERT INTO categories (id, name) VALUES
    ('movies', 'Movies'),
    ('science', 'Science'),
    ('sports', 'Sports'),
    ('food', 'Food'),
    ('pop_culture', 'Pop Culture'),
    ('tech', 'Tech'),
    ('history', 'History'),
    ('travel', 'Travel'),
    ('music', 'Music');
