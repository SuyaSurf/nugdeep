"use client";

import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  Clock3,
  CloudRain,
  Eye,
  HeartHandshake,
  Home,
  Lock,
  MessageCircle,
  Newspaper,
  Pause,
  PenLine,
  PersonStanding,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Undo2,
  UserRound,
  Zap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type View = "feed" | "game" | "profile";
type Category = "personal" | "news" | "opportunities" | "vibes" | "events";
type PersonalTag = "insight" | "musings" | "vlogs";
type ActionKey = "go" | "wait" | "look" | "around";
type Relation = "good" | "slow" | "bad" | "break";
type TimingBucket = "quick" | "good" | "slow";
type Obstacle = "person" | "car" | "rain" | "staff";
type ScoreKey = "read" | "care" | "steady";
type PressureKey = "traffic" | "crowd" | "weather";

type ScoreMap = Record<ScoreKey, number>;

type PathState = {
  timeMs: number;
  safe: number;
  clues: number;
  calm: number;
  progress: number;
  live: boolean;
};

type Choice = {
  key: ActionKey;
  baseLabel: string;
  icon: LucideIcon;
  delay: number;
  state: Partial<Omit<PathState, "timeMs" | "live">>;
  delta: Partial<ScoreMap>;
};

type SceneChoice = {
  label: string;
  copy: string;
};

type StoryScene = {
  id: string;
  label: string;
  place: string;
  obstacle: Obstacle;
  pressure: PressureKey;
  line: string;
  hint: string;
  choices: Record<ActionKey, SceneChoice>;
  feedback: Record<ActionKey, string>;
  relations: Record<ActionKey, Relation>;
  timing: {
    min: number;
    slow: number;
  };
};

type RunEvent = {
  sceneId: string;
  sceneLabel: string;
  obstacle: Obstacle;
  action: ActionKey;
  actionLabel: string;
  relation: Relation;
  feedback: string;
  pressure: number;
  pressureLabel: string;
  bucket: TimingBucket;
  decisionMs: number;
  timeAfter: number;
  stateAfter: PathState;
  scores: Partial<ScoreMap>;
};

type RunResult = {
  id: string;
  dateKey: string;
  score: number;
  timeMs: number;
  benchmarkMs: number;
  passed: boolean;
  scores: ScoreMap;
  state: PathState;
  events: RunEvent[];
};

type ReplaySnapshot = {
  score: number;
  timeMs: number;
  passed: boolean;
  route: Array<{
    label: string;
    action: string;
    relation: Relation;
  }>;
};

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type SocialPost = {
  kind: "post";
  id: string;
  author: string;
  role: string;
  category: Category;
  tags: PersonalTag[];
  body: string;
  createdAt: string;
  comments: Comment[];
};

type RunShare = {
  kind: "run";
  id: string;
  author: string;
  role: string;
  category: Category;
  createdAt: string;
  replay: ReplaySnapshot;
  comments: Comment[];
};

type FeedItem = SocialPost | RunShare;

const MIN_ROUTE_STEPS = 4;
const MAX_ROUTE_STEPS = 30;
const DESTINATION_PROGRESS = 8;
const BENCHMARK_MS = 45000;

const dailyScenario = {
  neighborhood: "North Hall",
  setting: "Packed morning",
  headline: "The main line is crowded today.",
  destination: "Desk 7",
  story: "Arrive before 9.",
  pressures: {
    traffic: 64,
    crowd: 82,
    weather: 28
  }
};

const initialPath: PathState = {
  timeMs: 0,
  safe: 3,
  clues: 0,
  calm: 1,
  progress: 0,
  live: true
};

const categoryMeta: Array<{ key: Category; label: string; icon: LucideIcon }> = [
  { key: "personal", label: "Personal", icon: UserRound },
  { key: "news", label: "News", icon: Newspaper },
  { key: "opportunities", label: "Leads", icon: Briefcase },
  { key: "vibes", label: "Vibes", icon: Sparkles },
  { key: "events", label: "Events", icon: CalendarDays }
];

const scoreMeta: Array<{ key: ScoreKey; label: string; icon: LucideIcon }> = [
  { key: "read", label: "Judgment", icon: Eye },
  { key: "care", label: "EQ", icon: HeartHandshake },
  { key: "steady", label: "Reliability", icon: ShieldCheck }
];

const obstacleIcons: Record<Obstacle, LucideIcon> = {
  person: PersonStanding,
  car: Car,
  rain: CloudRain,
  staff: PersonStanding
};

const choices: Choice[] = [
  {
    key: "go",
    baseLabel: "Go",
    icon: Zap,
    delay: 700,
    state: { safe: -1, calm: -1, progress: 2 },
    delta: { steady: 1 }
  },
  {
    key: "wait",
    baseLabel: "Wait",
    icon: Pause,
    delay: 1700,
    state: { safe: 1, calm: 1, progress: 1 },
    delta: { care: 1, steady: 1 }
  },
  {
    key: "look",
    baseLabel: "Look",
    icon: Eye,
    delay: 1300,
    state: { clues: 2, calm: 1, progress: 1 },
    delta: { read: 2 }
  },
  {
    key: "around",
    baseLabel: "Around",
    icon: Route,
    delay: 2400,
    state: { safe: 2, calm: -1, progress: 1 },
    delta: { read: 1, care: 1 }
  }
];

const choiceMap = Object.fromEntries(choices.map((choice) => [choice.key, choice])) as Record<
  ActionKey,
  Choice
>;

const baseChoices: Record<ActionKey, SceneChoice> = {
  go: { label: "Go", copy: "fast" },
  wait: { label: "Wait", copy: "hold" },
  look: { label: "Look", copy: "read" },
  around: { label: "Around", copy: "reroute" }
};

const baseScores: ScoreMap = {
  read: 82,
  care: 84,
  steady: 86
};

const zeroScores: ScoreMap = {
  read: 0,
  care: 0,
  steady: 0
};

const initialItems: FeedItem[] = [
  {
    kind: "post",
    id: "seed-1",
    author: "Mira Chen",
    role: "Product founder",
    category: "opportunities",
    tags: [],
    body: "Looking for two teams testing AI support tools with real customer pressure.",
    createdAt: "09:12",
    comments: [
      {
        id: "c-1",
        author: "Ada",
        body: "I can intro one.",
        createdAt: "09:26"
      }
    ]
  },
  {
    kind: "post",
    id: "seed-2",
    author: "Ada Nwosu",
    role: "Founder, Ledger Works",
    category: "personal",
    tags: ["insight"],
    body: "Good partner calls usually have one quiet clue before the obvious problem.",
    createdAt: "08:48",
    comments: []
  },
  {
    kind: "post",
    id: "seed-3",
    author: "Nadia Vale",
    role: "Community lead",
    category: "events",
    tags: [],
    body: "Founder breakfast tomorrow. Small room. Real asks.",
    createdAt: "10:04",
    comments: []
  },
  {
    kind: "post",
    id: "seed-4",
    author: "Owen Park",
    role: "Investor",
    category: "news",
    tags: [],
    body: "Proof beats polish when people need to know how you decide.",
    createdAt: "07:31",
    comments: []
  },
  {
    kind: "post",
    id: "seed-5",
    author: "Ire Bello",
    role: "Creative director",
    category: "vibes",
    tags: [],
    body: "A good profile should feel like timing, not bragging.",
    createdAt: "11:02",
    comments: []
  }
];

const evidence: Record<ScoreKey, string[]> = {
  read: ["Reads pressure before moving", "Spots small signals", "Adjusts when the route changes"],
  care: ["Keeps space under pressure", "Helps without losing pace", "Avoids careless moves"],
  steady: ["Six active days", "No broken public run", "Finishes after a bad start"]
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(name: string) {
  return `bammby:v7:${todayKey()}:${name}`;
}

function permanentKey(name: string) {
  return `bammby:v7:${name}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function moveLabel(relation: Relation) {
  if (relation === "good") return "Clean move";
  if (relation === "slow") return "Cost time";
  if (relation === "bad") return "Still alive";
  return "Route broke";
}

function pressureName(key: PressureKey) {
  if (key === "traffic") return "Traffic";
  if (key === "crowd") return "Crowd";
  return "Weather";
}

function pressureValue(key: PressureKey) {
  return dailyScenario.pressures[key];
}

function getStoryIntro() {
  const firstScene = getScene(0, initialPath, []);
  return {
    title: `${dailyScenario.neighborhood}: ${dailyScenario.setting}`,
    body: `${dailyScenario.headline} ${dailyScenario.story}`,
    detail: `${firstScene.line} Read the pressure before you move.`
  };
}

function getPressureRisk(scene: StoryScene, action: ActionKey, relation: Relation) {
  const pressure = pressureValue(scene.pressure);
  const actionRisk = action === "go" ? 20 : action === "around" ? 8 : action === "look" ? -10 : -6;
  const relationRisk = relation === "break" ? 25 : relation === "bad" ? 14 : relation === "slow" ? 6 : -8;
  return clamp(pressure + actionRisk + relationRisk, 0, 100);
}

function previewRisk(scene: StoryScene, action: ActionKey, state: PathState) {
  return getPressureRisk(scene, action, resolveRelation(scene, action, state));
}

function pressurePenalty(risk: number) {
  if (risk >= 85) return { delay: 1600, scores: { read: -2, steady: -1 } };
  if (risk >= 70) return { delay: 900, scores: { read: -1 } };
  if (risk <= 35) return { delay: -300, scores: { steady: 1 } };
  return { delay: 0, scores: {} };
}

function getRouteDotClassName(index: number, step: number, events: RunEvent[], gameLive: boolean) {
  const event = events[index];
  if (event) return `step-dot done ${event.relation}`;
  if (index === step && gameLive) return "step-dot active";
  return "step-dot";
}

function getRouteDotIcon(index: number, step: number, events: RunEvent[], gameLive: boolean, scene: StoryScene) {
  const event = events[index];
  if (event) return obstacleIcons[event.obstacle];
  if (index === step && gameLive) return obstacleIcons[scene.obstacle];
  return Check;
}

function getRouteDotLabel(index: number, step: number, events: RunEvent[], gameLive: boolean, scene: StoryScene) {
  const event = events[index];
  if (event) return String(index + 1);
  if (index === step && gameLive) return scene.label;
  return String(index + 1);
}

function getVisibleStepCount(step: number, events: RunEvent[], gameLive: boolean) {
  return Math.min(MAX_ROUTE_STEPS, Math.max(MIN_ROUTE_STEPS, events.length + (gameLive ? 1 : 0), step + 1));
}

function shouldFinishRun(stepIndex: number, event: RunEvent) {
  const stepsTaken = stepIndex + 1;
  if (!event.stateAfter.live) return true;
  if (stepsTaken >= MAX_ROUTE_STEPS) return true;
  return stepsTaken >= MIN_ROUTE_STEPS && event.stateAfter.progress >= DESTINATION_PROGRESS;
}

function getRunStats(events: RunEvent[], result: RunResult) {
  const peak = events.reduce((highest, event) => (event.pressure > highest.pressure ? event : highest), events[0]);
  const detours = events.filter((event) => event.action === "around" || event.relation === "slow").length;
  const breaks = events.filter((event) => event.relation === "break").length;
  const clean = events.filter((event) => event.relation === "good").length;
  const avgRisk =
    events.length === 0
      ? 0
      : Math.round(events.reduce((total, event) => total + event.pressure, 0) / events.length);

  return {
    avgRisk,
    clean,
    detours,
    peak,
    breaks,
    summary: result.passed
      ? `${events.length} moves. ${clean} clean. ${detours} detour${detours === 1 ? "" : "s"}.`
      : breaks > 0
        ? `Route broke at ${peak?.pressureLabel ?? "pressure"} ${peak?.pressure ?? 0}%.`
        : result.state.progress < DESTINATION_PROGRESS
          ? `${events.length} moves, but not enough progress.`
          : `${events.length} moves. Desk 7 reached, but too late.`
  };
}

function getBucket(ms: number, scene: StoryScene): TimingBucket {
  if (ms < scene.timing.min) return "quick";
  if (ms > scene.timing.slow) return "slow";
  return "good";
}

function firstAction(events: RunEvent[]) {
  return events[0]?.action;
}

function lastAction(events: RunEvent[]) {
  return events[events.length - 1]?.action;
}

function getScene(step: number, state: PathState, events: RunEvent[]): StoryScene {
  const first = firstAction(events);
  const last = lastAction(events);

  if (step === 0) {
    return {
      id: "crowd-start",
      label: "Start",
      place: `${dailyScenario.neighborhood} / main flow`,
      obstacle: "person",
      pressure: "crowd",
      line: "The line starts moving.",
      hint: "Desk 7 closes at 9.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Scan", copy: "signal" },
        around: { label: "Reroute", copy: "detour" }
      },
      feedback: {
        go: "Fast, but the line is packed.",
        wait: "You kept space.",
        look: "You found the open spot.",
        around: "Safer, but slower."
      },
      relations: { go: "bad", wait: "good", look: "good", around: "slow" },
      timing: { min: 450, slow: 6000 }
    };
  }

  if (step === 1) {
    if (first === "around") {
      return {
        id: "quiet-side",
        label: "Side Way",
        place: `${dailyScenario.neighborhood} / quiet side`,
        obstacle: "car",
        pressure: "traffic",
        line: "A cart crosses your way.",
        hint: "The driver is not looking up.",
        choices: {
          go: { label: "Slip past", copy: "tight" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Signal", copy: "read" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "You squeezed through.",
          wait: "The cart passed.",
          look: "The driver stopped.",
          around: "Safe, but slow."
        },
        relations: { go: "bad", wait: "good", look: "good", around: "slow" },
        timing: { min: 450, slow: 6200 }
      };
    }

    if (first === "go") {
      return {
        id: "tight-line",
        label: "Line",
        place: `${dailyScenario.neighborhood} / main line`,
        obstacle: "staff",
        pressure: "crowd",
        line: "A staff member blocks the next spot.",
        hint: "No one waved you in.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Read staff", copy: "signal" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "The spot was closed.",
          wait: "You lost time.",
          look: "You saw the signal.",
          around: "You avoided the block."
        },
        relations: { go: "break", wait: "slow", look: "good", around: "good" },
        timing: { min: 450, slow: 6200 }
      };
    }

    return {
      id: "open-desk",
      label: "Line",
      place: `${dailyScenario.neighborhood} / main line`,
      obstacle: "staff",
      pressure: "crowd",
      line: "A staff member opens one spot.",
      hint: "The signal is small.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Scan", copy: "signal" },
        around: { label: "Next spot", copy: "detour" }
      },
      feedback: {
        go: "Good if you saw it. Risky if you guessed.",
        wait: "Someone else took it.",
        look: "You saw the signal.",
        around: "Another spot opened."
      },
      relations: { go: "bad", wait: "slow", look: "good", around: "good" },
      timing: { min: 450, slow: 6200 }
    };
  }

  if (step === 2) {
    if (state.safe <= 1) {
      return {
        id: "tight-crowd",
        label: "Crowd",
        place: `${dailyScenario.neighborhood} / middle flow`,
        obstacle: "person",
        pressure: "weather",
        line: "The crowd gets tight.",
        hint: "A loose bag swings near you.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Scan", copy: "signal" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "You hit the bag.",
          wait: "The crowd opened.",
          look: "You saw the bag.",
          around: "Safe, but slower."
        },
        relations: { go: "break", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6400 }
      };
    }

    if (state.clues >= 2) {
      return {
        id: "dropped-badge",
        label: "Crowd",
        place: `${dailyScenario.neighborhood} / middle flow`,
        obstacle: "person",
        pressure: "crowd",
        line: "Someone drops a pass.",
        hint: "The owner is falling behind.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Assist", copy: "control" },
          look: { label: "Find owner", copy: "read" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "Fast, but you missed help.",
          wait: "They point you ahead.",
          look: "You found the owner.",
          around: "Safe, but slower."
        },
        relations: { go: "bad", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6400 }
      };
    }

    if (last === "around") {
      return {
        id: "side-crowd",
        label: "Crowd",
        place: `${dailyScenario.neighborhood} / side flow`,
        obstacle: "rain",
        pressure: "weather",
        line: "The side path is wet.",
        hint: "The ground is slick near the door.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Scan", copy: "signal" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "You got squeezed.",
          wait: "The path cleared.",
          look: "You found a dry strip.",
          around: "Safe, but slow."
        },
        relations: { go: "bad", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6400 }
      };
    }

    return {
      id: "moving-crowd",
      label: "Crowd",
      place: `${dailyScenario.neighborhood} / middle flow`,
      obstacle: "person",
      pressure: "crowd",
      line: "Someone drops a pass.",
      hint: "The owner is falling behind.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Find owner", copy: "read" },
        around: { label: "Reroute", copy: "detour" }
      },
      feedback: {
        go: "Fast, but risk went up.",
        wait: "The crowd stayed calm.",
        look: "You saw the owner.",
        around: "Safe, but slow."
      },
      relations: { go: "bad", wait: "good", look: "good", around: "slow" },
      timing: { min: 500, slow: 6400 }
    };
  }

  if (step === 3) {
    if (state.clues >= 4) {
      return {
        id: "clear-desk",
        label: "Desk",
        place: `${dailyScenario.neighborhood} / front desk`,
        obstacle: "staff",
        pressure: "crowd",
        line: "The desk opens.",
        hint: "You have a clear gap.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Verify", copy: "signal" },
          around: { label: "Other spot", copy: "detour" }
        },
        feedback: {
          go: "You used the opening.",
          wait: "Safe, but late.",
          look: "You confirmed the spot.",
          around: "Works, but slow."
        },
        relations: { go: "good", wait: "slow", look: "good", around: "slow" },
        timing: { min: 500, slow: 6600 }
      };
    }

    if (last === "around") {
      return {
        id: "side-desk",
        label: "Desk",
        place: `${dailyScenario.neighborhood} / side desk`,
        obstacle: "staff",
        pressure: "crowd",
        line: "The side desk pauses.",
        hint: "The staff member is still busy.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Verify", copy: "signal" },
          around: { label: "Reroute", copy: "detour" }
        },
        feedback: {
          go: "The desk was not ready.",
          wait: "The desk opened.",
          look: "You saw the opening.",
          around: "Safe, but slow."
        },
        relations: { go: "break", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6600 }
      };
    }

    return {
      id: "closed-desk",
      label: "Desk",
      place: `${dailyScenario.neighborhood} / front desk`,
      obstacle: "staff",
      pressure: "crowd",
      line: "The staff member raises a hand.",
      hint: "The desk is not ready.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Read staff", copy: "signal" },
        around: { label: "Other spot", copy: "detour" }
      },
      feedback: {
        go: "The desk was closed.",
        wait: "The desk opened.",
        look: "You read the signal.",
        around: "Safe, but slow."
      },
      relations: { go: "break", wait: "good", look: "good", around: "slow" },
      timing: { min: 500, slow: 6600 }
    };
  }

  if (state.progress < DESTINATION_PROGRESS) {
    if (last === "go" || state.safe <= 1) {
      return {
        id: `extra-line-${step}`,
        label: "Extra line",
        place: `${dailyScenario.neighborhood} / longer route`,
        obstacle: "staff",
        pressure: "crowd",
        line: "A second line opens.",
        hint: "Bad moves add more line time.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Read staff", copy: "signal" },
          around: { label: "Other spot", copy: "detour" }
        },
        feedback: {
          go: "Risk stayed high.",
          wait: "You waited it out.",
          look: "You found the right line.",
          around: "Safe, but longer."
        },
        relations: { go: "bad", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6800 }
      };
    }

    if (last === "around") {
      return {
        id: `extra-weather-${step}`,
        label: "Long way",
        place: `${dailyScenario.neighborhood} / side route`,
        obstacle: "rain",
        pressure: "weather",
        line: "The long way gets wet.",
        hint: "You need one clean move.",
        choices: {
          go: { label: "Proceed", copy: "direct" },
          wait: { label: "Hold", copy: "control" },
          look: { label: "Watch ground", copy: "signal" },
          around: { label: "Stay covered", copy: "detour" }
        },
        feedback: {
          go: "Fast, but slippery.",
          wait: "You kept control.",
          look: "You found the dry gap.",
          around: "Safe, but slow."
        },
        relations: { go: "bad", wait: "good", look: "good", around: "slow" },
        timing: { min: 500, slow: 6800 }
      };
    }

    return {
      id: `extra-line-${step}`,
      label: "Delay",
      place: `${dailyScenario.neighborhood} / slow line`,
      obstacle: "person",
      pressure: "traffic",
      line: "The line slows down.",
      hint: "You are not close enough yet.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Find gap", copy: "signal" },
        around: { label: "Reroute", copy: "detour" }
      },
      feedback: {
        go: "You gained little.",
        wait: "The line moved.",
        look: "You found a gap.",
        around: "Longer, but safe."
      },
      relations: { go: "bad", wait: "good", look: "good", around: "slow" },
      timing: { min: 500, slow: 6800 }
    };
  }

  if (state.safe >= 5 || state.clues >= 5) {
    return {
      id: "saved-seat",
      label: "Desk",
      place: dailyScenario.destination,
      obstacle: "person",
      pressure: "traffic",
      line: "Your name is still on the list.",
      hint: "The desk is close.",
      choices: {
        go: { label: "Finish", copy: "close" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Verify", copy: "signal" },
        around: { label: "Reroute", copy: "detour" }
      },
      feedback: {
        go: "You made it.",
        wait: "Still safe.",
        look: "Careful, but late.",
        around: "Clear finish."
      },
      relations: { go: "good", wait: "good", look: "slow", around: "good" },
      timing: { min: 550, slow: 7000 }
    };
  }

  if (state.safe <= 1) {
    return {
      id: "closing-desk",
      label: "Desk",
      place: dailyScenario.destination,
      obstacle: "staff",
      pressure: "crowd",
      line: "The last desk opening starts closing.",
      hint: "Desk 7 is close.",
      choices: {
        go: { label: "Proceed", copy: "direct" },
        wait: { label: "Hold", copy: "control" },
        look: { label: "Read staff", copy: "signal" },
        around: { label: "Reroute", copy: "detour" }
      },
      feedback: {
        go: "It closed on you.",
        wait: "You stayed alive.",
        look: "You found the safe beat.",
        around: "You stayed clear."
      },
      relations: { go: "break", wait: "good", look: "slow", around: "good" },
      timing: { min: 550, slow: 7000 }
    };
  }

  return {
    id: "final-desk",
    label: "Desk",
    place: dailyScenario.destination,
    obstacle: "person",
    pressure: "traffic",
    line: "A staff member points to Desk 7.",
    hint: "The last opening is closing.",
    choices: {
      go: { label: "Proceed", copy: "direct" },
      wait: { label: "Hold", copy: "control" },
      look: { label: "Read staff", copy: "signal" },
      around: { label: "Reroute", copy: "detour" }
    },
    feedback: {
      go: "Fast, but risky.",
      wait: "You arrive steady.",
      look: "Good read, late clock.",
      around: "You used the clear side."
    },
    relations: { go: "bad", wait: "good", look: "slow", around: "good" },
    timing: { min: 550, slow: 7000 }
  };
}

function resolveRelation(scene: StoryScene, action: ActionKey, state: PathState): Relation {
  if (scene.id === "open-desk" && action === "go") {
    return state.clues >= 2 || state.calm >= 2 ? "good" : "bad";
  }

  if (scene.id === "open-desk" && action === "wait") {
    return state.calm >= 2 ? "good" : "slow";
  }

  if (scene.id === "clear-desk" && action === "go") {
    return state.clues >= 4 ? "good" : "break";
  }

  if (scene.id === "final-desk" && action === "go") {
    return state.safe >= 4 || state.clues >= 4 ? "good" : "bad";
  }

  if (scene.obstacle === "rain" && action === "go") {
    return state.safe <= 1 ? "break" : scene.relations[action];
  }

  return scene.relations[action];
}

function relationEffect(relation: Relation): {
  delay: number;
  state: Partial<Omit<PathState, "timeMs" | "live">>;
  scores: Partial<ScoreMap>;
} {
  if (relation === "good") {
    return { delay: -300, state: { safe: 1, progress: 1 }, scores: { read: 1, steady: 1 } };
  }

  if (relation === "slow") {
    return { delay: 1400, state: { safe: 1, calm: 1 }, scores: { care: 1 } };
  }

  if (relation === "bad") {
    return { delay: 2100, state: { safe: -1, calm: -1, progress: -1 }, scores: { steady: -1, care: -1 } };
  }

  return { delay: 3200, state: { safe: -2, calm: -2 }, scores: { read: -2, steady: -2 } };
}

function addScores(base: ScoreMap, delta: Partial<ScoreMap>) {
  const next = { ...base };
  (Object.keys(delta) as ScoreKey[]).forEach((key) => {
    next[key] += delta[key] ?? 0;
  });
  return next;
}

function applyState(
  state: PathState,
  delta: Partial<Omit<PathState, "timeMs" | "live">>,
  timeDelta: number,
  relation: Relation
): PathState {
  const safe = clamp(state.safe + (delta.safe ?? 0), 0, 5);

  return {
    timeMs: state.timeMs + timeDelta,
    safe,
    clues: clamp(state.clues + (delta.clues ?? 0), 0, 6),
    calm: clamp(state.calm + (delta.calm ?? 0), 0, 5),
    progress: clamp(state.progress + (delta.progress ?? 0), 0, DESTINATION_PROGRESS),
    live: state.live && relation !== "break" && safe > 0
  };
}

function evaluateChoice(
  scene: StoryScene,
  action: ActionKey,
  decisionMs: number,
  state: PathState
): RunEvent {
  const choice = choiceMap[action];
  const sceneChoice = scene.choices[action] ?? baseChoices[action];
  const relation = resolveRelation(scene, action, state);
  const effect = relationEffect(relation);
  const risk = getPressureRisk(scene, action, relation);
  const pressure = pressurePenalty(risk);
  const bucket = getBucket(decisionMs, scene);
  const timingDelay = bucket === "slow" ? 900 : bucket === "quick" && action === "go" ? 500 : 0;
  const delay = Math.max(400, choice.delay + effect.delay + timingDelay + pressure.delay);
  const afterChoice = applyState(state, choice.state, 0, relation);
  const stateAfter = applyState(afterChoice, effect.state, decisionMs + delay, relation);
  const scores = addScores(addScores(addScores(zeroScores, choice.delta), effect.scores), pressure.scores);
  const eventRelation = stateAfter.live ? relation : "break";

  return {
    sceneId: scene.id,
    sceneLabel: scene.label,
    obstacle: scene.obstacle,
    action,
    actionLabel: sceneChoice.label,
    relation: eventRelation,
    feedback: eventRelation === "break" && relation !== "break" ? "Pressure was too high." : scene.feedback[action],
    pressure: risk,
    pressureLabel: pressureName(scene.pressure),
    bucket,
    decisionMs,
    timeAfter: stateAfter.timeMs,
    stateAfter,
    scores
  };
}

function normalizeScores(raw: ScoreMap): ScoreMap {
  return {
    read: clamp(76 + raw.read * 4, 0, 100),
    care: clamp(78 + raw.care * 4, 0, 100),
    steady: clamp(78 + raw.steady * 4, 0, 100)
  };
}

function scoreRun(events: RunEvent[], finalState: PathState): RunResult {
  const raw = events.reduce((scores, event) => addScores(scores, event.scores), zeroScores);
  const scores = normalizeScores(raw);
  const average = Object.values(scores).reduce((total, score) => total + score, 0) / 3;
  const passed =
    finalState.live && finalState.progress >= DESTINATION_PROGRESS && finalState.timeMs <= BENCHMARK_MS;

  return {
    id: `run-${Date.now()}`,
    dateKey: todayKey(),
    score: clamp(Math.round(average + (BENCHMARK_MS - finalState.timeMs) / 2200), 1, 100),
    timeMs: finalState.timeMs,
    benchmarkMs: BENCHMARK_MS,
    passed,
    scores,
    state: finalState,
    events
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function replayFromRun(result: RunResult): ReplaySnapshot {
  return {
    score: result.score,
    timeMs: result.timeMs,
    passed: result.passed,
    route: result.events.map((event) => ({
      label: event.sceneLabel,
      action: event.actionLabel,
      relation: event.relation
    }))
  };
}

export default function HomePage() {
  const [view, setView] = useState<View>("feed");
  const [category, setCategory] = useState<Category>("personal");
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [passOpen, setPassOpen] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);
  const [gameLive, setGameLive] = useState(false);
  const [step, setStep] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [pathState, setPathState] = useState<PathState>(initialPath);
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState<Category>("personal");
  const [draftTag, setDraftTag] = useState<PersonalTag>("insight");
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    setItems(readJson(permanentKey("items"), initialItems));
    setPassOpen(window.localStorage.getItem(storageKey("pass")) === "open");
    setRun(readJson<RunResult | null>(storageKey("run"), null));
  }, []);

  useEffect(() => {
    writeJson(permanentKey("items"), items);
  }, [items]);

  const visibleItems = items.filter((item) => item.category === category);

  const profileScores = useMemo(() => {
    if (!run) return baseScores;
    return {
      read: Math.round((baseScores.read * 2 + run.scores.read) / 3),
      care: Math.round((baseScores.care * 2 + run.scores.care) / 3),
      steady: Math.round((baseScores.steady * 2 + run.scores.steady) / 3)
    };
  }, [run]);

  const week = useMemo(() => {
    const days = ["M", "T", "W", "T", "F", "S", "S"];
    return days.map((day, index) => ({
      day,
      active: index < (passOpen ? 6 : 5),
      score: clamp(76 + index * 3 + (passOpen && index === 5 ? 7 : 0), 0, 100)
    }));
  }, [passOpen]);

  function startRun() {
    setView("game");
    setGameLive(true);
    setRun(null);
    setEvents([]);
    setStep(0);
    setPathState(initialPath);
    setStartedAt(performance.now());
  }

  function choose(action: ActionKey) {
    const scene = getScene(step, pathState, events);
    const decisionMs = Math.round(performance.now() - startedAt);
    const event = evaluateChoice(scene, action, decisionMs, pathState);
    const nextEvents = [...events, event];

    if (shouldFinishRun(step, event)) {
      const result = scoreRun(nextEvents, event.stateAfter);
      setEvents(nextEvents);
      setRun(result);
      setGameLive(false);
      setPathState(event.stateAfter);
      setPassOpen(result.passed);
      if (result.passed) {
        window.localStorage.setItem(storageKey("pass"), "open");
      } else {
        window.localStorage.removeItem(storageKey("pass"));
      }
      writeJson(storageKey("run"), result);
      return;
    }

    setEvents(nextEvents);
    setPathState(event.stateAfter);
    setStep((current) => current + 1);
    setStartedAt(performance.now());
  }

  function clearLocalState() {
    window.localStorage.removeItem(storageKey("pass"));
    window.localStorage.removeItem(storageKey("run"));
    window.localStorage.removeItem(permanentKey("items"));
    setItems(initialItems);
    setPassOpen(false);
    setRun(null);
    setGameLive(false);
    setEvents([]);
    setPathState(initialPath);
    setStep(0);
    setOpenComments(null);
    setDraft("");
    setCommentDraft("");
    setView("feed");
  }

  function publishPost() {
    if (!passOpen) {
      startRun();
      return;
    }

    const body = draft.trim();
    if (!body) return;

    const nextPost: SocialPost = {
      kind: "post",
      id: `post-${Date.now()}`,
      author: "Ada Nwosu",
      role: "Founder, Ledger Works",
      category: draftCategory,
      tags: draftCategory === "personal" ? [draftTag] : [],
      body,
      createdAt: "Now",
      comments: []
    };

    setItems((current) => [nextPost, ...current]);
    setDraft("");
    setCategory(draftCategory);
  }

  function publishComment(itemId: string) {
    if (!passOpen) {
      startRun();
      return;
    }

    const body = commentDraft.trim();
    if (!body) return;

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              comments: [
                ...item.comments,
                {
                  id: `comment-${Date.now()}`,
                  author: "Ada",
                  body,
                  createdAt: "Now"
                }
              ]
            }
          : item
      )
    );
    setCommentDraft("");
  }

  function shareReplay() {
    if (!run || !run.passed) return;

    const nextShare: RunShare = {
      kind: "run",
      id: `run-share-${Date.now()}`,
      author: "Ada Nwosu",
      role: "Founder, Ledger Works",
      category: "personal",
      createdAt: "Now",
      replay: replayFromRun(run),
      comments: []
    };

    setItems((current) => [nextShare, ...current]);
    setCategory("personal");
    setOpenComments(nextShare.id);
    setCommentDraft("");
    setView("feed");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView("feed")}>
          <span>Nd</span>
          <strong>Nugdeep</strong>
        </button>
        <button className={passOpen ? "pass-chip open" : "pass-chip"} type="button" onClick={startRun}>
          {passOpen ? <BadgeCheck size={16} /> : <Lock size={16} />}
          <span>{passOpen ? "Post open" : "Run first"}</span>
        </button>
        <button className="ghost-icon" type="button" onClick={clearLocalState} aria-label="Reset local state">
          <Undo2 size={17} />
        </button>
      </header>

      {view === "feed" && (
        <FeedView
          category={category}
          commentDraft={commentDraft}
          draft={draft}
          draftCategory={draftCategory}
          draftTag={draftTag}
          items={visibleItems}
          openComments={openComments}
          passOpen={passOpen}
          result={run}
          setCategory={setCategory}
          setCommentDraft={setCommentDraft}
          setDraft={setDraft}
          setDraftCategory={setDraftCategory}
          setDraftTag={setDraftTag}
          setOpenComments={setOpenComments}
          startRun={startRun}
          publishComment={publishComment}
          publishPost={publishPost}
        />
      )}

      {view === "game" && (
        <GameView
          choose={choose}
          events={events}
          gameLive={gameLive}
          pathState={pathState}
          result={run}
          shareReplay={shareReplay}
          startRun={startRun}
          step={step}
        />
      )}

      {view === "profile" && (
        <ProfileView
          passOpen={passOpen}
          profileScores={profileScores}
          recentPosts={items.filter((item): item is SocialPost => item.kind === "post").slice(0, 4)}
          result={run}
          week={week}
        />
      )}

      <nav className="tabbar" aria-label="Primary">
        <NavButton active={view === "feed"} icon={Home} label="Feed" onClick={() => setView("feed")} />
        <NavButton active={view === "game"} icon={Zap} label="Run" onClick={() => setView("game")} />
        <NavButton
          active={view === "profile"}
          icon={UserRound}
          label="Profile"
          onClick={() => setView("profile")}
        />
      </nav>
    </main>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={active ? "tab active" : "tab"} type="button" onClick={onClick}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function FeedView({
  category,
  commentDraft,
  draft,
  draftCategory,
  draftTag,
  items,
  openComments,
  passOpen,
  result,
  setCategory,
  setCommentDraft,
  setDraft,
  setDraftCategory,
  setDraftTag,
  setOpenComments,
  startRun,
  publishComment,
  publishPost
}: {
  category: Category;
  commentDraft: string;
  draft: string;
  draftCategory: Category;
  draftTag: PersonalTag;
  items: FeedItem[];
  openComments: string | null;
  passOpen: boolean;
  result: RunResult | null;
  setCategory: (category: Category) => void;
  setCommentDraft: (value: string) => void;
  setDraft: (value: string) => void;
  setDraftCategory: (category: Category) => void;
  setDraftTag: (tag: PersonalTag) => void;
  setOpenComments: (id: string | null) => void;
  startRun: () => void;
  publishComment: (itemId: string) => void;
  publishPost: () => void;
}) {
  return (
    <div className="stack">
      <section className="daily-card">
        <div>
          <span>Arrival Run</span>
          <strong>{passOpen ? "You can post" : "Daily run needed"}</strong>
          <p>
            {result
              ? `${result.score} points / ${formatTime(result.timeMs)}`
              : `${dailyScenario.neighborhood}: ${dailyScenario.setting}`}
          </p>
        </div>
        <button className={passOpen ? "soft-button clear" : "soft-button"} type="button" onClick={startRun}>
          {passOpen ? <Check size={16} /> : <Zap size={16} />}
          <span>{passOpen ? "Replay" : "Run"}</span>
        </button>
      </section>

      <section className={passOpen ? "composer ready" : "composer locked"}>
        <textarea
          disabled={!passOpen}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => {
            if (!passOpen) startRun();
          }}
          placeholder={passOpen ? "Post anything useful." : "Daily run first."}
          rows={2}
        />
        <div className="composer-tools">
          <div className="mini-segments">
            {categoryMeta.map(({ key, label }) => (
              <button
                className={draftCategory === key ? "mini-segment active" : "mini-segment"}
                key={key}
                type="button"
                onClick={() => setDraftCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {draftCategory === "personal" && (
            <div className="tag-select">
              {(["insight", "musings", "vlogs"] as PersonalTag[]).map((tag) => (
                <button
                  className={draftTag === tag ? "tag active" : "tag"}
                  key={tag}
                  type="button"
                  onClick={() => setDraftTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <button className="send-button" type="button" onClick={publishPost}>
            {passOpen ? <Send size={17} /> : <Lock size={17} />}
            <span>{passOpen ? "Post" : "Run"}</span>
          </button>
        </div>
      </section>

      <section className="lane-bar">
        {categoryMeta.map(({ key, label, icon: Icon }) => (
          <button
            className={category === key ? "lane active" : "lane"}
            key={key}
            type="button"
            onClick={() => setCategory(key)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </section>

      <section className="feed-list">
        {items.map((item) => (
          <FeedCard
            commentDraft={commentDraft}
            item={item}
            key={item.id}
            open={openComments === item.id}
            passOpen={passOpen}
            publishComment={publishComment}
            setCommentDraft={setCommentDraft}
            setOpen={() => setOpenComments(openComments === item.id ? null : item.id)}
            startRun={startRun}
          />
        ))}
      </section>
    </div>
  );
}

function FeedCard({
  commentDraft,
  item,
  open,
  passOpen,
  publishComment,
  setCommentDraft,
  setOpen,
  startRun
}: {
  commentDraft: string;
  item: FeedItem;
  open: boolean;
  passOpen: boolean;
  publishComment: (itemId: string) => void;
  setCommentDraft: (value: string) => void;
  setOpen: () => void;
  startRun: () => void;
}) {
  return (
    <article className={item.kind === "run" ? "post run-share" : "post"}>
      <header className="post-head">
        <button className="avatar" type="button" aria-label={`${item.author} profile`}>
          {item.author[0]}
        </button>
        <div>
          <strong>{item.author}</strong>
          <span>
            {item.role} / {item.createdAt}
          </span>
        </div>
        {item.kind === "run" && <span className="proof-pill">run</span>}
      </header>

      {item.kind === "post" ? (
        <>
          <p>{item.body}</p>
          <footer className="post-foot">
            <span>{item.category}</span>
            {item.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            <button className="comment-button" type="button" onClick={setOpen}>
              <MessageCircle size={15} />
              {item.comments.length}
            </button>
          </footer>
        </>
      ) : (
        <>
          <ReplayCard replay={item.replay} />
          <footer className="post-foot">
            <span className="signal-pill">
              <BadgeCheck size={14} />
              Daily clear
            </span>
            <button className="comment-button" type="button" onClick={setOpen}>
              <MessageCircle size={15} />
              {item.comments.length}
            </button>
          </footer>
        </>
      )}

      {open && (
        <div className="comment-drawer">
          {item.comments.length > 0 && (
            <div className="comment-list">
              {item.comments.map((comment) => (
                <div className="comment" key={comment.id}>
                  <strong>{comment.author}</strong>
                  <span>{comment.body}</span>
                </div>
              ))}
            </div>
          )}
          <div className="comment-compose">
            <input
              disabled={!passOpen}
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder={passOpen ? "Reply" : "Daily run first"}
            />
            <button
              className="round-action"
              type="button"
              onClick={() => (passOpen ? publishComment(item.id) : startRun())}
              aria-label={passOpen ? "Send reply" : "Daily run first"}
            >
              {passOpen ? <Send size={15} /> : <Lock size={15} />}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ReplayCard({ replay }: { replay: ReplaySnapshot }) {
  return (
    <div className="replay-card">
      <div className="replay-topline">
        <span>{replay.passed ? "Clear" : "Miss"}</span>
        <strong>
          {replay.score} / {formatTime(replay.timeMs)}
        </strong>
      </div>
      <div className="route-strip">
        {replay.route.map((item, index) => (
          <div className={`route-dot ${item.relation}`} key={`${item.label}-${index}`}>
            <span>{item.label}</span>
            <strong>{item.action}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameView({
  choose,
  events,
  gameLive,
  pathState,
  result,
  shareReplay,
  startRun,
  step
}: {
  choose: (action: ActionKey) => void;
  events: RunEvent[];
  gameLive: boolean;
  pathState: PathState;
  result: RunResult | null;
  shareReplay: () => void;
  startRun: () => void;
  step: number;
}) {
  const scene = getScene(step, result?.state ?? pathState, events);
  const SegmentIcon = obstacleIcons[scene.obstacle];
  const stateForDisplay = result?.state ?? pathState;
  const lastEvent = events[events.length - 1];
  const storyIntro = getStoryIntro();
  const visibleStepCount = getVisibleStepCount(step, events, gameLive);
  const runStats = result ? getRunStats(result.events, result) : null;

  return (
    <div className="stack">
      <section className="game-panel">
        <header className="game-head">
          <div>
            <span className="micro">Arrival Run</span>
            <h1>{gameLive ? scene.label : result ? (result.passed ? "Clear" : "Missed") : "Ready?"}</h1>
          </div>
          <span className={stateForDisplay.live ? "run-state clear" : "run-state"}>
            {events.length + (gameLive ? 1 : 0)}/{MAX_ROUTE_STEPS}
          </span>
        </header>

        <div className="destination-card">
          <span>
            {dailyScenario.neighborhood} / {dailyScenario.setting}
          </span>
          <strong>{dailyScenario.destination}</strong>
          <p>{dailyScenario.story}</p>
          <small>
            {dailyScenario.headline} / {scene.place}
          </small>
        </div>

        <div className="pressure-grid">
          <PressureChip label="Traffic" value={dailyScenario.pressures.traffic} />
          <PressureChip label="Crowd" value={dailyScenario.pressures.crowd} />
          <PressureChip label="Weather" value={dailyScenario.pressures.weather} />
        </div>

        <div className="step-track">
          {Array.from({ length: visibleStepCount }).map((_, index) => {
            const Icon = getRouteDotIcon(index, step, events, gameLive, scene);
            return (
            <div className={getRouteDotClassName(index, step, events, gameLive)} key={index}>
              <Icon size={20} />
              <small>{getRouteDotLabel(index, step, events, gameLive, scene)}</small>
            </div>
            );
          })}
        </div>

        <div className="simple-stats">
          <StateChip label="Time" value={formatTime(stateForDisplay.timeMs)} />
          <StateChip label="Route" value={`${stateForDisplay.progress}/${DESTINATION_PROGRESS}`} />
        </div>

        {!gameLive && !result && (
          <div className="start-card">
            <div className="story-intro">
              <span>{storyIntro.title}</span>
              <strong>{storyIntro.body}</strong>
              <p>{storyIntro.detail}</p>
            </div>
            <div className="route-brief">
              <div>
                <span>Best case</span>
                <strong>4-5 moves</strong>
              </div>
              <div>
                <span>Hard cap</span>
                <strong>30 moves</strong>
              </div>
              <div>
                <span>Target</span>
                <strong>{DESTINATION_PROGRESS} progress</strong>
              </div>
            </div>
            <p>{dailyScenario.story} Clean moves finish faster. Bad moves add steps.</p>
            <button className="primary-action" type="button" onClick={startRun}>
              Start run
            </button>
          </div>
        )}

        {gameLive && (
          <div className="decision-card">
            {events.length === 0 && (
              <div className="story-intro compact">
                <span>{storyIntro.title}</span>
                <strong>{storyIntro.body}</strong>
              </div>
            )}
            {lastEvent && (
              <div className={`move-feedback ${lastEvent.relation}`}>
                <span>
                  {moveLabel(lastEvent.relation)} / {lastEvent.pressureLabel} {lastEvent.pressure}%
                </span>
                <strong>{lastEvent.feedback}</strong>
              </div>
            )}
            <div className="prompt-card">
              <SegmentIcon size={48} />
              <div>
                <h2>{scene.line}</h2>
                <p>{scene.hint}</p>
              </div>
            </div>
            <div className="scene-risk">
              <span>Active pressure</span>
              <strong>
                {pressureName(scene.pressure)} {pressureValue(scene.pressure)}%
              </strong>
            </div>
            <div className="choice-grid">
              {choices.map((choice) => {
                const Icon = choice.icon;
                const sceneChoice = scene.choices[choice.key] ?? baseChoices[choice.key];
                const risk = previewRisk(scene, choice.key, stateForDisplay);
                return (
                  <button
                    className="choice"
                    key={choice.key}
                    type="button"
                    onClick={() => choose(choice.key)}
                  >
                    <Icon size={24} />
                    <strong>{sceneChoice.label}</strong>
                    <span>{sceneChoice.copy} / risk {risk}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {result && (
          <div className={result.passed ? "result-card" : "result-card failed"}>
            <div className="result-score">
              <span>
                {result.passed
                  ? "You made it"
                  : result.state.live && result.state.progress < DESTINATION_PROGRESS
                    ? "Too long"
                    : result.state.live
                      ? "Too slow"
                      : "Route broke"}
              </span>
              <strong>{result.score}</strong>
            </div>
            <div className="simple-stats">
              <StateChip label="Time" value={formatTime(result.timeMs)} />
              <StateChip label="Steps" value={String(result.events.length)} />
            </div>
            <button className="primary-action" type="button" onClick={result.passed ? shareReplay : startRun}>
              {result.passed ? "Share run" : "Try again"}
            </button>
          </div>
        )}

        {result && runStats && (
          <section className="run-review">
            <header>
              <span>Run review</span>
              <strong>{runStats.summary}</strong>
            </header>
            <div className="review-grid">
              <StateChip label="Avg risk" value={`${runStats.avgRisk}%`} />
              <StateChip label="Clean" value={String(runStats.clean)} />
              <StateChip label="Detours" value={String(runStats.detours)} />
            </div>
            {runStats.peak && (
              <p>
                Peak pressure: {runStats.peak.pressureLabel} {runStats.peak.pressure}% on{" "}
                {runStats.peak.sceneLabel.toLowerCase()}.
              </p>
            )}
          </section>
        )}
      </section>

      <section className="replay">
        <header className="section-line">
          <span>Your route</span>
          <Clock3 size={15} />
        </header>
        {events.length === 0 ? (
          <div className="blank-replay">No moves yet</div>
        ) : (
          events.map((event) => {
            const Icon = obstacleIcons[event.obstacle];
            return (
              <div className={`replay-item ${event.relation}`} key={event.sceneId}>
                <Icon size={18} />
                <div>
                  <strong>
                    {event.sceneLabel}: {event.actionLabel}
                  </strong>
                  <span>
                    {moveLabel(event.relation)} / {event.pressureLabel} {event.pressure}% /{" "}
                    {formatTime(event.timeAfter)}
                  </span>
                </div>
                <ChevronRight size={16} />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function StateChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="state-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PressureChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="pressure-chip">
      <span>{label}</span>
      <strong>{value}%</strong>
    </div>
  );
}

function ProfileView({
  passOpen,
  profileScores,
  recentPosts,
  result,
  week
}: {
  passOpen: boolean;
  profileScores: ScoreMap;
  recentPosts: SocialPost[];
  result: RunResult | null;
  week: Array<{ day: string; active: boolean; score: number }>;
}) {
  const [selectedSignal, setSelectedSignal] = useState<ScoreKey>("read");
  const best = scoreMeta.reduce((currentBest, item) =>
    profileScores[item.key] > profileScores[currentBest.key] ? item : currentBest
  );

  return (
    <div className="stack">
      <section className="profile-top">
        <div className="profile-cover">
          <span>ada.nug/ada</span>
          <strong>Ada's week</strong>
        </div>
        <div className="profile-main">
          <div className="profile-avatar">AN</div>
          <div>
            <span className="micro">Founder / Ledger Works</span>
            <h1>Ada Nwosu</h1>
            <p>Builds trust tools. Shares useful asks.</p>
          </div>
          <button className="follow-button" type="button">
            Follow
          </button>
        </div>
        <div className="profile-metrics">
          <Metric label="Week" value={passOpen ? "6/7" : "5/7"} />
          <Metric label="Today" value={result ? String(result.score) : "-"} />
          <Metric label="Best" value={best.label} />
        </div>
      </section>

      <section className="score-panel">
        <header className="section-line">
          <span>Scores</span>
          <span>7 days</span>
        </header>
        <div className="profile-score-grid">
          {scoreMeta.map(({ key, label, icon: Icon }) => (
            <button
              className={selectedSignal === key ? "profile-score active" : "profile-score"}
              key={key}
              type="button"
              onClick={() => setSelectedSignal(key)}
            >
              <Icon size={19} />
              <span>{label}</span>
              <strong>{profileScores[key]}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="evidence-panel">
        <header className="section-line">
          <span>Why</span>
          <BadgeCheck size={15} />
        </header>
        {evidence[selectedSignal].map((row, index) => (
          <Evidence key={row} title={`Proof ${index + 1}`} copy={row} score={profileScores[selectedSignal]} />
        ))}
      </section>

      <section className="week-panel">
        <header className="section-line">
          <span>Week</span>
          <span>public</span>
        </header>
        <div className="week-row">
          {week.map((day, index) => (
            <div className={day.active ? "week-day active" : "week-day"} key={`${day.day}-${index}`}>
              <span>{day.day}</span>
              <strong>{day.active ? day.score : "-"}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-posts">
        <header className="section-line">
          <span>Recent posts</span>
          <PenLine size={15} />
        </header>
        {recentPosts.map((post) => (
          <div className="profile-post" key={post.id}>
            <span>{post.category}</span>
            <p>{post.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Evidence({ title, copy, score }: { title: string; copy: string; score: number }) {
  return (
    <div className="evidence">
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <b>{score}</b>
    </div>
  );
}
