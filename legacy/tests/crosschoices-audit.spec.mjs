/**
 * Crosschoices audit — Playwright e2e + logic checks
 * Run: npx playwright test tests/crosschoices-audit.spec.mjs
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { lookup } from 'mime-types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const HTML_PATH = join(PUBLIC, 'crosschoices.html');

// --- Logic extracted from HTML for unit-style assertions ---
function loadCoreFromHtml() {
  const html = readFileSync(HTML_PATH, 'utf8');
  const constStart = html.indexOf('const ACTION_EMOJI');
  const end = html.indexOf('class BootScene');
  const block = html.slice(constStart, end);
  const fn = new Function(`
    ${block}
    return {
      dailySeed, mulberry32, generateDailyPuzzle, getOutcome,
      bestActionForSegment, traitSum, buildReplayStrip, buildShareText,
      ACTION_EMOJI, REPLAY_OUTCOME
    };
  `);
  return fn();
}

const MENU_PLAY_Y = 390; // h*0.52 + btnH/2 on 700px canvas
const BTN_WAIT_X = 200;
const BTN_GO_X = 104;
const BTN_DETOUR_X = 296;
const BTN_Y = 600;

const CORE = loadCoreFromHtml();

const ALL_RULE_CASES = [
  { seg: { type: 'pedestrian', visibleStatus: '😠' }, action: 'wait', insight: 0, icon: 'success', time: 2, traits: { ei: 1, insight: 1, reliability: 0 } },
  { seg: { type: 'pedestrian', visibleStatus: '😠' }, action: 'go', insight: 0, icon: 'fail', time: 5, traits: { ei: 0, insight: 0, reliability: -1 } },
  { seg: { type: 'pedestrian', visibleStatus: '😊' }, action: 'go', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 1, reliability: 0 } },
  { seg: { type: 'pedestrian', visibleStatus: '😴' }, action: 'go', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 0, reliability: 1 } },
  { seg: { type: 'dog', visibleStatus: '⚡' }, action: 'detour', insight: 0, icon: 'success', time: 0, traits: { ei: 1, insight: 1, reliability: 0 } },
  { seg: { type: 'dog', visibleStatus: '😴' }, action: 'go', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 0, reliability: 1 } },
  { seg: { type: 'weather', visibleStatus: '💧' }, action: 'wait', insight: 0, icon: 'success', time: 2, traits: { ei: 1, insight: 0, reliability: 0 } },
  { seg: { type: 'weather', visibleStatus: '🌬️' }, action: 'detour', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 1, reliability: 0 } },
  { seg: { type: 'car', visibleStatus: '⏱️', policePresent: false }, action: 'detour', insight: 0, icon: 'success', time: 2, traits: { ei: 0, insight: 0, reliability: 1 } },
  { seg: { type: 'car', visibleStatus: '⏱️', policePresent: true }, action: 'go', insight: 0, icon: 'fail', time: 6, traits: { ei: 0, insight: 0, reliability: -1 } },
  { seg: { type: 'car', visibleStatus: '⏱️', policePresent: true }, action: 'go', insight: 2, icon: 'success', time: 1, traits: { ei: 0, insight: 2, reliability: 0 } },
  { seg: { type: 'bus', visibleStatus: '🕒' }, action: 'wait', insight: 0, icon: 'success', time: 2, traits: { ei: 1, insight: 0, reliability: 0 } },
  { seg: { type: 'bus', visibleStatus: '👥' }, action: 'detour', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 1, reliability: 0 } },
  { seg: { type: 'police', visibleStatus: '👀' }, action: 'wait', insight: 0, icon: 'success', time: 1, traits: { ei: 0, insight: 0, reliability: 1 } },
  { seg: { type: 'police', visibleStatus: '📢' }, action: 'detour', insight: 0, icon: 'success', time: 2, traits: { ei: 0, insight: 1, reliability: 0 } },
];

let server;
let baseURL;

test.beforeAll(async () => {
  server = createServer((req, res) => {
    const path = req.url === '/' ? '/crosschoices.html' : req.url;
    const file = join(PUBLIC, path.replace(/^\//, ''));
    try {
      const data = readFileSync(file);
      res.writeHead(200, { 'Content-Type': lookup(file) || 'text/html' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  baseURL = `http://127.0.0.1:${port}/crosschoices.html`;
});

test.afterAll(() => {
  server?.close();
});

test.describe('Logic audit', () => {
  test('all 13 rule blocks return spec outcomes', () => {
    for (const c of ALL_RULE_CASES) {
      const o = CORE.getOutcome(c.seg, c.action, c.insight);
      expect(o.outcomeIcon, JSON.stringify(c)).toBe(c.icon);
      expect(o.timePenalty, JSON.stringify(c)).toBe(c.time);
      expect(o.traits).toEqual(c.traits);
    }
  });

  test('unknown combo defaults to clock +3', () => {
    const o = CORE.getOutcome({ type: 'pedestrian', visibleStatus: '😠' }, 'invalid', 0);
    expect(o.outcomeIcon).toBe('clock');
    expect(o.timePenalty).toBe(3);
  });

  test('daily puzzle is deterministic for same seed', () => {
    const p1 = CORE.generateDailyPuzzle(CORE.mulberry32(20260524));
    const p2 = CORE.generateDailyPuzzle(CORE.mulberry32(20260524));
    expect(p1.map((s) => s.type)).toEqual(p2.map((s) => s.type));
    expect(p1.map((s) => s.visibleStatus)).toEqual(p2.map((s) => s.visibleStatus));
    expect(p1.map((s) => s.policePresent)).toEqual(p2.map((s) => s.policePresent));
  });

  test('car+police has no optimal action at insight 0 (BUG: was using insight 99)', () => {
    const seg = { type: 'car', visibleStatus: '⏱️', policePresent: true };
    const best = CORE.bestActionForSegment(seg, 0);
    expect(best).toBeNull();
  });

  test('car+police optimal is go only at insight >= 2', () => {
    const seg = { type: 'car', visibleStatus: '⏱️', policePresent: true };
    expect(CORE.bestActionForSegment(seg, 1)).toBeNull();
    expect(CORE.bestActionForSegment(seg, 2)).toBe('go');
  });

  test('replay strip uses warning for clock outcomes', () => {
    const strip = CORE.buildReplayStrip([
      { obstacleEmoji: '🚗', actionEmoji: '⏸️', outcomeEmoji: '⚠️' }
    ]);
    expect(strip).toContain('⚠️');
    expect(strip).not.toContain('🕒');
  });
});

test.describe('Browser e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const hook = () => {
        if (typeof Phaser === 'undefined' || !Phaser.Game) return false;
        const Orig = Phaser.Game;
        if (Orig.__hooked) return true;
        Phaser.Game = function (config) {
          const g = new Orig(config);
          window.__crosschoicesGame = g;
          return g;
        };
        Phaser.Game.__hooked = true;
        return true;
      };
      const id = setInterval(() => { if (hook()) clearInterval(id); }, 5);
    });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#game-container canvas', { timeout: 15000 });
  });

  async function canvasClick(page, x, y) {
    const box = await page.locator('#game-container canvas').boundingBox();
    await page.mouse.click(box.x + x, box.y + y);
  }

  async function activeScene(page) {
    return page.evaluate(() => {
      const g = window.crosschoicesGame || window.__crosschoicesGame;
      const s = g?.scene?.scenes?.find((sc) => sc.sys?.isActive());
      return s?.scene?.key ?? null;
    });
  }

  async function gameState(page) {
    return page.evaluate(() => {
      const g = window.crosschoicesGame || window.__crosschoicesGame;
      const s = g?.scene?.scenes?.find((sc) => sc.sys?.isActive());
      if (!s) return null;
      const key = s.scene.key;
      if (key === 'GameScene') {
        return {
          scene: key,
          segmentIndex: s.segmentIndex,
          totalTime: s.totalTime,
          traits: { ...s.traits },
          cumulativeInsight: s.cumulativeInsight,
          segments: s.segments?.map((x) => ({
            type: x.type,
            status: x.visibleStatus,
            police: x.policePresent
          })),
          replayLen: s.replayLog?.length
        };
      }
      if (key === 'ResultScene') {
        return {
          scene: key,
          totalTime: s.resultData?.totalTime,
          traits: s.resultData?.traits,
          shareText: s.shareText
        };
      }
      return { scene: key };
    });
  }

  test('boots to menu, no page errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.waitForTimeout(800);
    expect(await activeScene(page)).toBe('MenuScene');
    expect(errors).toEqual([]);
  });

  test('play flow reaches results after 5 segments', async ({ page }) => {
    await canvasClick(page, 200, MENU_PLAY_Y);
    await page.waitForTimeout(800);
    expect(await activeScene(page)).toBe('GameScene');

    for (let i = 0; i < 5; i++) {
      await canvasClick(page, BTN_WAIT_X, BTN_Y);
      await page.waitForTimeout(1100);
    }
    await page.waitForTimeout(300);
    const st = await gameState(page);
    expect(st.scene).toBe('ResultScene');
    expect(st.totalTime).toBeGreaterThanOrEqual(0);
    expect(st.shareText).toMatch(/Play Crosschoices:/);
    expect(st.shareText).toMatch(/Final: \d+s/);
  });

  test('play again keeps same daily segments', async ({ page }) => {
    await canvasClick(page, 200, MENU_PLAY_Y);
    await page.waitForTimeout(800);
    const first = (await gameState(page)).segments;

    for (let i = 0; i < 5; i++) {
      await canvasClick(page, BTN_WAIT_X, BTN_Y);
      await page.waitForTimeout(1100);
    }
    await page.waitForTimeout(300);
    await canvasClick(page, 200, 590);
    await page.waitForTimeout(500);
    const second = (await gameState(page)).segments;
    expect(second).toEqual(first);
  });

  test('double-click does not advance two segments', async ({ page }) => {
    await canvasClick(page, 200, MENU_PLAY_Y);
    await page.waitForTimeout(800);
    await canvasClick(page, BTN_WAIT_X, BTN_Y);
    await canvasClick(page, BTN_WAIT_X, BTN_Y);
    await page.waitForTimeout(200);
    const st = await gameState(page);
    expect(st?.replayLen).toBe(1);
  });

  test('handleChoice totals match CrosschoicesCore simulation', async ({ page }) => {
    await canvasClick(page, 200, MENU_PLAY_Y);
    await page.waitForTimeout(800);

    const actions = ['wait', 'go', 'detour', 'wait', 'go'];
    const expected = await page.evaluate((acts) => {
      const core = window.CrosschoicesCore;
      const g = window.crosschoicesGame || window.__crosschoicesGame;
      const s = g.scene.scenes.find((sc) => sc.sys?.isActive());
      let total = 0;
      let insight = 0;
      const traits = { ei: 0, insight: 0, reliability: 0 };
      for (let i = 0; i < 5; i++) {
        const seg = s.segments[i];
        const action = acts[i];
        const before = insight;
        const o = core.getOutcome(seg, action, before);
        total += o.timePenalty;
        traits.ei += o.traits.ei;
        traits.insight += o.traits.insight;
        traits.reliability += o.traits.reliability;
        insight += o.traits.insight;
        const optimal = core.bestActionForSegment(seg, before);
        if (optimal !== null && action === optimal) {
          insight += 1;
          traits.insight += 1;
        }
      }
      return { total, traits };
    }, actions);

    const xs = [BTN_WAIT_X, BTN_GO_X, BTN_DETOUR_X, BTN_WAIT_X, BTN_GO_X];
    for (let i = 0; i < 5; i++) {
      await canvasClick(page, xs[i], BTN_Y);
      await page.waitForTimeout(1100);
    }
    const st = await gameState(page);
    expect(st.scene).toBe('ResultScene');
    expect(st.totalTime).toBe(expected.total);
    expect(st.traits).toEqual(expected.traits);
  });

  test('car police emoji hidden until insight >= 2', async ({ page }, testInfo) => {
    await canvasClick(page, 200, MENU_PLAY_Y);
    await page.waitForTimeout(800);

    const hasPoliceText = () =>
      page.evaluate(() => {
        const g = window.crosschoicesGame || window.__crosschoicesGame;
        const s = g.scene.scenes.find((sc) => sc.sys?.isActive());
        return !!s.policeText;
      });

    const segments = (await gameState(page)).segments;
    const carIdx = segments.findIndex((s) => s.type === 'car' && s.police);
    if (carIdx < 0) {
      testInfo.skip(true, 'No car+police segment in today\'s puzzle');
      return;
    }

    for (let i = 0; i < carIdx; i++) {
      await canvasClick(page, BTN_WAIT_X, BTN_Y);
      await page.waitForTimeout(1100);
    }
    if ((await gameState(page)).cumulativeInsight < 2) {
      expect(await hasPoliceText()).toBe(false);
    }
  });
});
