---
title: The Daily Expedition — Comprehensive Game Plan
status: draft
created: 2026-06-17
---

# The Daily Expedition — Comprehensive Game Plan

## Goal

Transform Nugdeep from a matchmaking-dependent experience into a daily habit by giving every player a guaranteed 60-second solo expedition that unlocks discovery, collection, and streak-based progression.

## Core Loop (60 seconds)

1. **Tease** → 2. **Challenge** → 3. **Reveal** → 4. **Deep Dive** → 5. **Reward** → 6. **Share**

---

## 1. Entry Point — "Today's Expedition"

### Lobby / Home Card

```
┌─────────────────────────────────────┐
│  🌍 Today's Expedition              │
│  Somewhere in East Asia awaits...   │
│                                     │
│  [ Start Expedition ]               │
│  Your streak: 🔥 7 days             │
│  Atlas: 12 / 195 discovered         │
└─────────────────────────────────────┘
```

- **Completed state:** Shows country flag, fact snippet, and "Completed today" badge.
- **Missed streak:** Shows "Streak broken 🔥 0" with a gentle recovery prompt.
- **Tap through:** Leads directly into the challenge.

---

## 2. The Challenge — Themed Engine Variant

### Design Principle

Each country maps to one of your existing engines with a thematic skin. The core mechanic stays identical; only the visuals and prompt change. This lets you launch with 8 ready engines × 195 countries without building 195 new games.

### Engine × Country Mapping Examples

| Country | Engine | Thematic Variant |
|---------|--------|-----------------|
| Japan | Palette | Memorize the flag colors, reproduce from a gradient |
| Brazil | The Button | Christ the Redeemer silhouette slowly reveals; stop when you recognize it |
| Egypt | Food Remedy | "Which civilization invented this dish?" (speed answer) |
| France | Quick Draw | Tap when the Eiffel Tower appears among random landmarks |
| Australia | Quick Draw | Tap when a kangaroo appears among other animals |
| Italy | The Button | Pizza oven timer; stop when the crust is perfectly golden |
| India | Palette | Memorize the saffron-white-green sequence |
| South Korea | Quick Draw | Tap when you see Taekwondo among other martial arts |

### Difficulty Calibration

- **Target duration:** 20–40 seconds per challenge.
- **Win condition:** Score above the daily threshold (e.g., 700/1000).
- **Retry policy:** One attempt per day. No retries. This creates stakes.
- **Score formula:** Speed × Accuracy, capped at 1000.

### Challenge Failure Flow

If the player fails (score below threshold):
- Country remains locked.
- Gray placeholder appears on atlas.
- Player sees: "The expedition failed. Tomorrow's destination awaits."
- Streak breaks unless a **Streak Shield** is active.

---

## 3. The Reveal — Country Unlock

### Unlock Animation

1. Challenge completes.
2. Screen transitions to a map zooming into the region.
3. Country border lights up with a golden pulse.
4. Flag unfurls.
5. **The Daily Fact** appears.

### The Daily Fact

One unique, surprising, brag-worthy fact per country. Not Wikipedia trivia. Something that makes the player go "I didn't know that."

Examples:
- **Japan:** "The Shinkansen's average delay is 54 seconds — across the entire network."
- **Brazil:** "There is a McDonald's in every single Brazilian state — including one floating on the Amazon River."
- **Egypt:** "Ancient Egyptians invented toothpaste. It was made of rock salt, mint, dried iris flowers, and pepper."
- **France:** "There are more roundabouts in France than any other country — over 30,000."
- **Australia:** "There are 10 times more camels in Australia than koalas."
- **Italy:** "The Italian military once tried to train dolphins to attach mines to enemy ships. It did not go well."
- **India:** "India has the world's only floating post office — on Dal Lake, Kashmir."
- **South Korea:** "Seoul's subway stations are numbered, and some have virtual grocery stores on the platform walls."

### Post-Reveal Screen

```
┌─────────────────────────────────────┐
│  🇯🇵 Japan — Unlocked!               │
│                                     │
│  "The Shinkansen's average delay    │
│   is 54 seconds."                  │
│                                     │
│  Score: 847 / 1000                  │
│  Global rank: #1,247                │
│                                     │
│  [ Deep Dive: 2 Quizzes ]         │
│  [ Share Discovery ]                │
│  [ Back to Atlas ]                 │
└─────────────────────────────────────┘
```

---

## 4. Deep Dive — Two 3-Fact Quizzes

### Quiz 1: Country & Culture (3 questions)

- Geography, history, customs, food, inventions.
- Multiple choice. 5 seconds per question.
- Example:
  - Q: "Which of these was invented in Japan?"
  - A: Instant noodles, B: Pizza, C: French fries, D: Tacos

### Quiz 2: Language & Identity (3 questions)

- Greetings, numbers, common phrases, writing system, cultural nuances.
- Example:
  - Q: "What does 'Konnichiwa' mean?"
  - A: Goodbye, B: Hello, C: Thank you, D: Sorry

### Scoring & Incentives

- Each quiz: 100 points per correct answer = 300 max per quiz.
- **Perfect score on both (600/600):** Earns a **Streak Shield** (protects one missed day).
- **Combined expedition + quiz score:** Posted to the daily leaderboard.
- Quiz results unlock a deeper fact card in the atlas.

---

## 5. Streak & Rewards

### Streak Mechanics

- **Current streak:** Consecutive days with a successful expedition.
- **Longest streak:** All-time best.
- **Streak break:** Miss a day = current streak resets to 0.
- **Streak Shield:** Earned by perfect quiz scores. Consumes on a missed day to preserve streak.

### Reward Tiers

| Days | Reward | Visual Change |
|------|--------|---------------|
| 3 | Bronze Compass | Compass needle turns bronze |
| 7 | Silver Map Theme | Atlas parchment becomes silver |
| 14 | Gold UI Accents | Lobby accent colors shift to gold |
| 30 | Master Explorer Badge | Profile badge visible to all |
| 50 | Legendary Cartographer | Title on leaderboard + special atlas border |
| 7-day perfect week | Streak Shield | Miss one day without breaking streak |

### Reward Delivery

- Unlocked immediately on the milestone day.
- Animated reward screen.
- Applied globally across the app (profile, lobby, atlas).

---

## 6. The Atlas — Persistent Collection View

### World Map

- Full world map.
- Discovered countries: colored with their flag.
- Undiscovered countries: grayed out, labeled with "?".
- Current day's country: pulsing gold border.
- Tap any discovered country: opens its fact card.

### Fact Card

```
┌─────────────────────────────────────┐
│  🇯🇵 Japan                           │
│  Discovered: 2026-06-17             │
│  Best score: 847                    │
│                                     │
│  📌 Daily Fact                      │
│  "The Shinkansen's average delay    │
│   is 54 seconds."                  │
│                                     │
│  🧠 Deep Dive Facts (Quiz Unlocked) │
│  • Japan has over 5 million         │
│    vending machines.                │
│  • The word "tsunami" is Japanese.  │
│  • Square watermelons are a         │
│    real thing.                      │
│                                     │
│  🏆 Quizzes                         │
│  Culture: 3/3 ✅                    │
│  Language: 2/3 ⚠️                  │
└─────────────────────────────────────┘
```

### Progress Indicators

- **Overall:** "12 / 195 discovered"
- **By region:** "East Asia: 3/6, Europe: 5/44, Africa: 1/54..."
- **Completionist tracker:** "First continent complete: Europe (44/44)" → special badge.

---

## 7. Leaderboard & Social

### Daily Leaderboard

- Ranked by combined expedition + quiz score.
- Shows: username, country unlocked today, score, streak.
- Top 1% gets "Elite Explorer" flair for 24 hours.

### Share Card

```
┌─────────────────────────────────────┐
│  🌍 Nugdeep Daily Expedition        │
│                                     │
│  🇯🇵 Japan — Unlocked!               │
│  "The Shinkansen's average delay    │
│   is 54 seconds."                  │
│                                     │
│  Score: 847 | Rank: #1,247          │
│  🔥 Streak: 7 days                   │
│  🗺️ Atlas: 12 / 195 discovered       │
│                                     │
│  Can you beat it?                   │
│  nugdeep.suya.surf                  │
└─────────────────────────────────────┘
```

- Text fallback for copy-paste.
- Image card for social media (auto-generated).

---

## 8. Data Model

### `daily_destinations` Table

| Column | Type | Description |
|--------|------|-------------|
| date | date (PK) | The day this destination is active |
| country_code | string | ISO 3166-1 alpha-2 |
| country_name | string | Display name |
| region | string | Continent/region group |
| daily_fact | string | The single unique fact |
| deep_dive_facts | JSON | Array of 6 deeper facts (3 per quiz) |
| quiz_culture | JSON | 3 MCQs: {question, options[4], correctIndex} |
| quiz_language | JSON | 3 MCQs: {question, options[4], correctIndex} |
| challenge_type | string | Engine ID: the_button, palette, quick_draw, food_remedy |
| challenge_params | JSON | Thematic variant config |
| score_threshold | int | Minimum to unlock (e.g., 700) |

### `user_atlas` Table

| Column | Type | Description |
|--------|------|-------------|
| user_id | string (PK) | Clerk user ID |
| country_code | string (PK) | Discovered country |
| discovered_date | date | When unlocked |
| expedition_score | int | Best challenge score |
| quiz_culture_score | int | 0–300 |
| quiz_language_score | int | 0–300 |
| total_score | int | expedition + quiz scores |
| streak_shield_earned | bool | Perfect quizzes = true |

### `user_streaks` Table

| Column | Type | Description |
|--------|------|-------------|
| user_id | string (PK) | Clerk user ID |
| current_streak | int | Consecutive successful days |
| longest_streak | int | All-time best |
| last_played_date | date | Most recent expedition date |
| streak_shields | int | Available shields (max 3) |
| active_rewards | JSON | Array of unlocked reward IDs |

### `daily_leaderboard` Table

| Column | Type | Description |
|--------|------|-------------|
| date | date (PK) | Leaderboard date |
| user_id | string (PK) | Player |
| country_code | string | Today's country |
| expedition_score | int | Challenge score |
| quiz_score | int | Combined quiz score |
| total_score | int | Final ranking score |
| rank | int | Calculated position |

---

## 9. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/expedition/today | Fetch today's destination, challenge config, and user's status |
| POST | /api/v1/expedition/complete | Submit challenge result; returns unlock status, fact, score |
| POST | /api/v1/expedition/quiz | Submit quiz answers; returns score, shield status, deeper facts |
| GET | /api/v1/expedition/leaderboard/:date | Daily ranked scores |
| GET | /api/v1/atlas | Full atlas for user (discovered + undiscovered) |
| GET | /api/v1/atlas/:country | Detail view for a single country |
| GET | /api/v1/streak | Current streak, longest, active rewards, shields |

---

## 10. UI Flow Summary

```
Home / Lobby
    └── Today's Expedition Card
        └── [Tap] → Challenge Screen (themed engine)
            └── [Win] → Unlock Animation → Reveal Screen
                ├── [Deep Dive] → Quiz 1 → Quiz 2 → Quiz Results
                ├── [Share] → Share Card (copy/image)
                └── [Atlas] → World Map
                    └── [Tap Country] → Fact Card
```

---

## 11. Launch Strategy

### Phase 1 (MVP — 2 weeks)

- 30 pre-seeded countries with full fact/quiz data.
- 4 engine variants reused (Button, Palette, Quick Draw, Food Remedy).
- Basic atlas (list view, not map).
- Streak tracking + 3-day / 7-day rewards.
- Daily leaderboard.
- Text share card.

### Phase 2 (Polish — 2 weeks)

- Full 195-country dataset.
- Interactive world map atlas.
- Image share cards.
- 14-day / 30-day / 50-day rewards.
- Streak Shield mechanic.
- Regional progress tracking.

### Phase 3 (Expansion)

- Themed weekly events (e.g., "Africa Week" — all countries from Africa).
- Multiplayer expedition races (who unlocks faster?)
- Community fact submissions (moderated).

---

## 12. Copy & Tone (per Production Copy Design)

- **Challenge start:** "Today's destination is hiding. Prove your skill to reveal it."
- **Win:** "Unlocked: Japan. One more for the atlas."
- **Fail:** "The expedition failed. Tomorrow brings a new destination."
- **Streak milestone:** "🔥 7 days. Silver Map unlocked."
- **Quiz prompt:** "3 questions. 5 seconds each. No overthinking."
- **Share:** "I unlocked [Country] today. [X]/195 found. 🔥 [N] days."

---

## 13. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| 195 countries × 6 facts × 6 quiz questions = too much content | Seed 30 for launch; crowdsource/community-build the rest |
| Quiz answers become known / memorized | Randomize question order; rotate 2 of 6 facts per quiz; add new questions monthly |
| Players fail and feel discouraged | Streak Shield protects; failure message is gentle; tomorrow is always new |
| Map UI is complex to build | Phase 1 uses a simple list/grid; map comes in Phase 2 |
| Daily destination rotation feels repetitive | Weekly themed events; special holiday countries; random "mystery destination" days |

---

## 14. Success Metrics

- **DAU/MAU ratio** — target > 0.3 (daily habit indicator)
- **Streak retention** — % of users with 7+ day streaks after 2 weeks
- **Share rate** — % of users who tap share after unlock
- **Quiz completion rate** — % who finish both quizzes after unlocking
- **Atlas view frequency** — average views per user per day

---

## 15. Next Step

Approve this plan and I will write the technical implementation spec with:
1. Database migration scripts
2. Go API handler stubs
3. React component tree
4. Daily destination seed data (first 30 countries)
5. Engine thematic variant configs
