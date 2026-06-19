export type LobbyIntent = "speed_date" | "make_friend" | "just_play";
export type IntentHandoff = "location_picker" | "friend_chat" | "results";

export interface IntentOption {
  id: LobbyIntent;
  number: string;
  label: string;
  shortLabel: string;
  description: string;
  promise: string;
  accent: string;
}

export interface LineupGame {
  id: string;
  category: string;
  status: "ready" | "coming_soon";
}

export interface FallbackActivity {
  id: number;
  day_of_year: number;
  prompt: string;
  type: string;
  options: Array<{ value: string; label: string; icon?: string }>;
}

const INTENTS: readonly IntentOption[] = [
  {
    id: "speed_date",
    number: "01",
    label: "Speed date",
    shortLabel: "Date",
    description: "Play a quick round. If it clicks, enter a private room.",
    promise: "Game, then a room to meet",
    accent: "#ff9368",
  },
  {
    id: "make_friend",
    number: "02",
    label: "Make a friend",
    shortLabel: "Friend",
    description: "Play first, talk after. No forced openers.",
    promise: "Game, then text or voice chat",
    accent: "#b8ff72",
  },
  {
    id: "just_play",
    number: "03",
    label: "Just play",
    shortLabel: "Play",
    description: "One match. One winner. Then leave or rematch.",
    promise: "Score, rematch, or leave",
    accent: "#8e9dff",
  },
] as const;

const HANDOFFS: Record<LobbyIntent, IntentHandoff> = {
  speed_date: "location_picker",
  make_friend: "friend_chat",
  just_play: "results",
};

const FALLBACK_ACTIVITIES: readonly Omit<FallbackActivity, "day_of_year">[] = [
  {
    id: 101,
    prompt: "Choose the color you would follow through fog.",
    type: "color_picker",
    options: [
      { value: "ember", label: "Ember" },
      { value: "violet", label: "Violet" },
      { value: "signal", label: "Signal green" },
      { value: "midnight", label: "Midnight blue" },
    ],
  },
  {
    id: 102,
    prompt: "A door opens somewhere below. Which sound came first?",
    type: "choice_grid",
    options: [
      { value: "bell", label: "A small bell", icon: "B" },
      { value: "rain", label: "Rain on glass", icon: "R" },
      { value: "steps", label: "Distant steps", icon: "S" },
      { value: "silence", label: "Nothing at all", icon: "0" },
    ],
  },
  {
    id: 103,
    prompt: "Pick a number before you have time to explain it.",
    type: "number_picker",
    options: Array.from({ length: 9 }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    })),
  },
] as const;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getIntentOptions(): readonly IntentOption[] {
  return INTENTS;
}

export function getIntentHandoff(intent: LobbyIntent): IntentHandoff {
  return HANDOFFS[intent];
}

export function getDailyGameLineup<T extends LineupGame>(
  games: readonly T[],
  dayKey: string,
): T[] {
  const readyByCategory = new Map<string, T[]>();

  for (const game of games) {
    if (game.status !== "ready") continue;
    const categoryGames = readyByCategory.get(game.category) ?? [];
    categoryGames.push(game);
    readyByCategory.set(game.category, categoryGames);
  }

  return [...readyByCategory.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, categoryGames]) => {
      const stableGames = [...categoryGames].sort((left, right) =>
        left.id.localeCompare(right.id),
      );
      const index = stableHash(`${dayKey}:${category}`) % stableGames.length;
      return stableGames[index];
    });
}

export function getDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getFallbackDailyActivity(dayKey: string): FallbackActivity {
  const index = stableHash(dayKey) % FALLBACK_ACTIVITIES.length;
  const activity = FALLBACK_ACTIVITIES[index];
  const start = new Date(`${dayKey}T00:00:00`);
  const yearStart = new Date(start.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (start.getTime() - yearStart.getTime()) / 86_400_000,
  );

  return {
    ...activity,
    options: activity.options.map((option) => ({ ...option })),
    day_of_year: dayOfYear,
  };
}
