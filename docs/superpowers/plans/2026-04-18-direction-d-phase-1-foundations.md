# Direction D Rebuild — Phase 1: Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the pure-logic layer and store changes that every later phase depends on. No UI yet.

**Architecture:** Pure TS modules under `src/lib/`, all TDD. Store extensions under `src/store/useStore.ts`. No new components. After this phase, `npm run build` passes with 0 TS errors and `npm run test:run` passes with all new + existing tests green.

**Tech Stack:** TypeScript, Vitest, zustand (existing).

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

---

## Task 1.1: Install dependencies and configure Tailwind theme

**Files:**
- Modify: `app/package.json` (add `react-router-dom`)
- Modify: `app/tailwind.config.js`
- Modify: `app/index.html` (Google Fonts link, body class)

- [ ] **Step 1: Install react-router-dom**

```bash
npm install react-router-dom@^6.28.0
```

Expected: `package.json` lists `react-router-dom` under `dependencies`; `package-lock.json` updated.

- [ ] **Step 2: Replace `tailwind.config.js` with theme extension**

Write `app/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:    { DEFAULT: '#0c0d10', 1: '#111318', 2: '#171a20', 3: '#1d2128' },
        line:  { DEFAULT: '#23272f', 2: '#2d323c' },
        ink:   { DEFAULT: '#e6e8ee', 2: '#b6bcc8' },
        muted: { DEFAULT: '#7a818d', 2: '#555b66' },
        accent:   { DEFAULT: '#fbbf24', 2: '#f59e0b' },
        good:  '#6ee7a7',
        warn:  '#fbbf24',
        bad:   '#f87171',
        cat: {
          code:     '#7AA2F7',
          creative: '#E879F9',
          comm:     '#F59E0B',
          meeting:  '#38BDF8',
          browse:   '#94A3B8',
        },
        web: {
          Code:          '#7AA2F7',
          Docs:          '#38BDF8',
          Work:          '#A78BFA',
          Comms:         '#F59E0B',
          News:          '#E5E7EB',
          Social:        '#FB7185',
          Entertainment: '#F472B6',
          Shopping:      '#FBBF24',
          AI:            '#6EE7A7',
          Other:         '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        serif: ['Fraunces', 'Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
```

Why: accent defaults to `peach` (`#fbbf24`) per spec. Category colors match mock.

- [ ] **Step 3: Update `index.html` with fonts and background palette**

Replace `app/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BuildTimeTracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,500&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-bg text-ink font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Build to verify the config compiles**

Run:

```bash
npm run build
```

Expected: `> tsc -b && vite build` completes, no errors. A `dist/` directory is produced.

- [ ] **Step 5: Commit**

```bash
git add app/package.json app/package-lock.json app/tailwind.config.js app/index.html
git commit -m "chore(foundations): add react-router-dom, extend Tailwind theme, load Google Fonts"
```

---

## Task 1.2: Update `types.ts` — drop `appOrder`, add new types

**Files:**
- Modify: `app/src/types.ts`

- [ ] **Step 1: Write the new `types.ts`**

Replace `app/src/types.ts`:

```ts
export type AWEvent = {
  id: number;
  timestamp: string;
  duration: number;
  data: { app: string; title?: string; url?: string };
};

export type TaskSession = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  events: AWEvent[];
};

export type AppSlice = {
  app: string;
  seconds: number;
  percent: number;
};

export type Category = 'code' | 'creative' | 'comm' | 'meeting' | 'browse';

export type WebCategory =
  | 'Code'
  | 'Docs'
  | 'Work'
  | 'Comms'
  | 'News'
  | 'Social'
  | 'Entertainment'
  | 'Shopping'
  | 'AI'
  | 'Other';

export type WebEvent = {
  id?: number;
  timestamp: string;
  duration: number;
  data: { url: string; title: string; domain?: string; tabCount?: number };
};

export type WebVisit = {
  timestamp: string;
  domain: string;
  url: string;
  title: string;
  duration: number;
};

export type DomainMeta = { cat: WebCategory; favicon: string };

export type Settings = {
  bucketId: string | null;
  webBucketId: string | null;
  lastError: string | null;
};
```

Change list:
- `TaskSession.appOrder` removed.
- `Category`, `WebCategory`, `WebEvent`, `WebVisit`, `DomainMeta` added.
- `Settings.webBucketId: string | null` added.

- [ ] **Step 2: Type-check to see what breaks**

Run:

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: TS errors in `src/store/useStore.ts` (references to `setAppOrder`, `TaskSession.appOrder`, old `Settings` shape), `src/components/AppBreakdown.tsx` (reads `appOrder`), and likely `src/components/*.tsx` tests. These are all fine — they'll be cleaned up later in this phase (Task 1.8) and Phase 7 (delete old components). Record the error count for later comparison.

- [ ] **Step 3: Commit**

```bash
git add app/src/types.ts
git commit -m "feat(types): drop TaskSession.appOrder; add Category, WebEvent, WebVisit, WebCategory, DomainMeta; Settings.webBucketId"
```

Breakage is fixed in Task 1.8 and Phase 7. Keep moving.

---

## Task 1.3: Create `lib/segments.ts` with TDD

**Files:**
- Create: `app/src/lib/segments.ts`
- Create: `app/src/test/lib/segments.test.ts`
- Modify: `app/src/lib/timeline.ts` (re-point to new module)

The current `timeline.ts` defines `toSegments` as a private helper. Extract it so the scene micro-strip, film strip, context-switch count, and drawer event log all consume a single implementation.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/segments.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toSegments } from '../../lib/segments';
import type { AWEvent } from '../../types';

function ev(id: number, app: string, isoStart: string, durSec: number): AWEvent {
  return { id, timestamp: isoStart, duration: durSec, data: { app } };
}

describe('toSegments', () => {
  it('returns empty array for no events', () => {
    expect(toSegments([])).toEqual([]);
  });

  it('merges consecutive same-app events with <= 1s gap', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'VS Code', '2026-04-18T09:00:30.500Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(1);
    expect(segs[0].app).toBe('VS Code');
    expect(segs[0].ids).toEqual([1, 2]);
    expect(segs[0].end - segs[0].start).toBe(60_500);
  });

  it('splits on same-app gap > 1s', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'VS Code', '2026-04-18T09:00:31.500Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(2);
    expect(segs[0].ids).toEqual([1]);
    expect(segs[1].ids).toEqual([2]);
  });

  it('splits on app change', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'Slack',   '2026-04-18T09:00:30.500Z', 30),
      ev(3, 'VS Code', '2026-04-18T09:01:01.000Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs.map((s) => s.app)).toEqual(['VS Code', 'Slack', 'VS Code']);
  });

  it('sorts events by timestamp before merging', () => {
    const events: AWEvent[] = [
      ev(2, 'VS Code', '2026-04-18T09:00:30.000Z', 30),
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(1);
    expect(segs[0].ids).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:run -- src/test/lib/segments.test.ts
```

Expected: FAIL — `Failed to resolve import "../../lib/segments"`.

- [ ] **Step 3: Implement `lib/segments.ts`**

Create `app/src/lib/segments.ts`:

```ts
import type { AWEvent } from '../types';

export type Segment = {
  app: string;
  title?: string;
  start: number;
  end: number;
  ids: number[];
};

export function toSegments(events: AWEvent[]): Segment[] {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const segments: Segment[] = [];
  for (const ev of sorted) {
    const start = new Date(ev.timestamp).getTime();
    const end = start + ev.duration * 1000;
    const last = segments[segments.length - 1];
    if (last && last.app === ev.data.app && start - last.end <= 1000) {
      last.end = Math.max(last.end, end);
      last.ids.push(ev.id);
    } else {
      segments.push({
        app: ev.data.app,
        title: ev.data.title,
        start,
        end,
        ids: [ev.id],
      });
    }
  }
  return segments;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run test:run -- src/test/lib/segments.test.ts
```

Expected: PASS — 5 tests in 1 file.

- [ ] **Step 5: Re-point `lib/timeline.ts` to consume `segments.ts`**

Replace the top of `app/src/lib/timeline.ts` (keep existing exports, remove the inline helper):

```ts
import type { AWEvent } from '../types';
import { toSegments } from './segments';

export function contextSwitches(events: AWEvent[]): number {
  const segments = toSegments(events);
  return Math.max(0, segments.length - 1);
}

export function longestStretch(events: AWEvent[]): {
  app: string;
  seconds: number;
} | null {
  const segments = toSegments(events);
  if (segments.length === 0) return null;
  let best = segments[0];
  let bestSec = (best.end - best.start) / 1000;
  for (const seg of segments) {
    const sec = (seg.end - seg.start) / 1000;
    if (sec > bestSec) {
      best = seg;
      bestSec = sec;
    }
  }
  return { app: best.app, seconds: bestSec };
}

export function detectInterruptions(
  events: AWEvent[],
  thresholdSec = 180,
): Set<number> {
  const segments = toSegments(events);
  const interrupted = new Set<number>();
  for (let i = 1; i < segments.length - 1; i++) {
    const prev = segments[i - 1];
    const mid = segments[i];
    const next = segments[i + 1];
    const midDurationSec = (mid.end - mid.start) / 1000;
    if (
      prev.app === next.app &&
      mid.app !== prev.app &&
      midDurationSec < thresholdSec
    ) {
      for (const id of mid.ids) interrupted.add(id);
    }
  }
  return interrupted;
}
```

- [ ] **Step 6: Run existing timeline tests**

Run:

```bash
npm run test:run -- src/test/lib/timeline.test.ts
```

Expected: PASS — existing assertions still hold because `toSegments` is byte-identical logic.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/segments.ts app/src/lib/timeline.ts app/src/test/lib/segments.test.ts
git commit -m "refactor(lib): extract toSegments to segments.ts; timeline consumes it"
```

---

## Task 1.4: Create `lib/focus.ts` with TDD

**Files:**
- Create: `app/src/lib/focus.ts`
- Create: `app/src/test/lib/focus.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/focus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { focusScore, dayFocusScore, moodClass } from '../../lib/focus';
import type { TaskSession, AWEvent } from '../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function session(
  id: string,
  startIso: string,
  endIso: string | null,
  events: AWEvent[],
): TaskSession {
  return {
    id,
    name: id,
    startedAt: startIso,
    endedAt: endIso,
    events,
  };
}

function ev(id: number, app: string, isoStart: string, durSec: number): AWEvent {
  return { id, timestamp: isoStart, duration: durSec, data: { app } };
}

describe('focusScore', () => {
  it('returns null for sessions under 60s', () => {
    const s = session('s1', '2026-04-18T16:59:30.000Z', '2026-04-18T16:59:59.000Z', []);
    expect(focusScore(s, NOW)).toBeNull();
  });

  it('returns 0.5 for a session with zero events', () => {
    const s = session('s1', '2026-04-18T16:00:00.000Z', '2026-04-18T16:30:00.000Z', []);
    expect(focusScore(s, NOW)).toBeCloseTo(0.5, 2);
  });

  it('scores a pure single-stretch session at the formula ceiling', () => {
    const s = session(
      's1',
      '2026-04-18T16:00:00.000Z',
      '2026-04-18T16:30:00.000Z',
      [ev(1, 'VS Code', '2026-04-18T16:00:00.000Z', 1800)],
    );
    // longestRatio = 1, switchPenalty = 0, score = 0.55 * 1 + 0.45 * 1 = 1.0
    expect(focusScore(s, NOW)).toBeCloseTo(1.0, 2);
  });

  it('penalises many switches', () => {
    // 10 different 1-minute segments → 9 switches, switchPenalty capped at 1
    const events: AWEvent[] = Array.from({ length: 10 }, (_, i) =>
      ev(i + 1, `App${i}`, `2026-04-18T16:${String(i).padStart(2, '0')}:00.000Z`, 60),
    );
    const s = session('s1', '2026-04-18T16:00:00.000Z', '2026-04-18T16:10:00.000Z', events);
    // longest = 60s, total = 600s, longestRatio = 0.1; switchPenalty = 1.
    // score = 0.55 * 0.1 + 0.45 * 0 = 0.055
    const score = focusScore(s, NOW);
    expect(score).toBeCloseTo(0.055, 2);
  });

  it('uses nowMs for active sessions', () => {
    const s = session('s1', '2026-04-18T16:30:00.000Z', null, [
      ev(1, 'VS Code', '2026-04-18T16:30:00.000Z', 1800),
    ]);
    const score = focusScore(s, NOW);
    // Same as the completed case above.
    expect(score).toBeCloseTo(1.0, 2);
  });
});

describe('dayFocusScore', () => {
  it('returns 0 for an empty day', () => {
    expect(dayFocusScore([], NOW)).toBe(0);
  });

  it('duration-weights per-session scores', () => {
    const a = session('a', '2026-04-18T10:00:00.000Z', '2026-04-18T10:30:00.000Z', [
      ev(1, 'VS Code', '2026-04-18T10:00:00.000Z', 1800),
    ]);
    const b = session('b', '2026-04-18T11:00:00.000Z', '2026-04-18T11:10:00.000Z', []);
    // a: score ~1.0, duration 1800
    // b: score 0.5, duration 600
    // expected: (1.0 * 1800 + 0.5 * 600) / 2400 = 0.875
    expect(dayFocusScore([a, b], NOW)).toBeCloseTo(0.875, 2);
  });
});

describe('moodClass', () => {
  it('bucketizes at 0.50 and 0.75', () => {
    expect(moodClass(0.74)).toBe('mixed');
    expect(moodClass(0.75)).toBe('deep');
    expect(moodClass(0.49)).toBe('scattered');
    expect(moodClass(0.50)).toBe('mixed');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/focus.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/focus.ts`**

Create `app/src/lib/focus.ts`:

```ts
import type { TaskSession } from '../types';
import { toSegments } from './segments';

export type Mood = 'deep' | 'mixed' | 'scattered';

export function sessionDurationSec(session: TaskSession, nowMs: number): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt ? new Date(session.endedAt).getTime() : nowMs;
  return Math.max(0, (end - start) / 1000);
}

export function focusScore(
  session: TaskSession,
  nowMs: number,
): number | null {
  const durSec = sessionDurationSec(session, nowMs);
  if (durSec < 60) return null;
  const segs = toSegments(session.events);
  if (segs.length === 0) return 0.5;
  const longestMs = segs.reduce((a, s) => Math.max(a, s.end - s.start), 0);
  const longestSec = longestMs / 1000;
  const switches = Math.max(0, segs.length - 1);
  const longestRatio = Math.min(1, longestSec / Math.max(60, durSec));
  const switchPenalty = Math.min(1, switches / 8);
  const score = 0.55 * longestRatio + 0.45 * (1 - switchPenalty);
  return Math.max(0, Math.min(1, score));
}

export function dayFocusScore(
  sessions: TaskSession[],
  nowMs: number,
): number {
  const scored = sessions
    .map((s) => ({
      dur: sessionDurationSec(s, nowMs),
      score: focusScore(s, nowMs),
    }))
    .filter((x): x is { dur: number; score: number } => x.score != null);
  const totalDur = scored.reduce((a, b) => a + b.dur, 0);
  if (totalDur === 0) return 0;
  return scored.reduce((a, b) => a + b.score * b.dur, 0) / totalDur;
}

export function moodClass(score: number): Mood {
  if (score >= 0.75) return 'deep';
  if (score >= 0.5) return 'mixed';
  return 'scattered';
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/focus.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/focus.ts app/src/test/lib/focus.test.ts
git commit -m "feat(lib): add focus.ts — focusScore, dayFocusScore, moodClass"
```

---

## Task 1.5: Create `lib/categories.ts` with TDD

**Files:**
- Create: `app/src/lib/categories.ts`
- Create: `app/src/test/lib/categories.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { APP_CATEGORY, appCategory } from '../../lib/categories';

describe('appCategory', () => {
  it('returns the default category for a known app (case-insensitive)', () => {
    expect(appCategory('VS Code')).toBe('code');
    expect(appCategory('vs code')).toBe('code');
    expect(appCategory('VS CODE')).toBe('code');
  });

  it('returns "browse" for unknown apps', () => {
    expect(appCategory('Obscure Journaling App')).toBe('browse');
    expect(appCategory('')).toBe('browse');
  });

  it('overrides defaults when an override is provided', () => {
    const overrides = { figma: 'code' as const };
    expect(appCategory('Figma', overrides)).toBe('code');
  });

  it('overrides are keyed case-insensitively', () => {
    const overrides = { 'linear': 'code' as const };
    expect(appCategory('Linear', overrides)).toBe('code');
  });

  it('falls through to defaults when the override is missing', () => {
    const overrides = { 'vs code': 'code' as const };
    expect(appCategory('Slack', overrides)).toBe('comm');
  });

  it('ships expected defaults for seed apps', () => {
    expect(appCategory('VS Code')).toBe('code');
    expect(appCategory('Cursor')).toBe('code');
    expect(appCategory('Terminal')).toBe('code');
    expect(appCategory('Warp')).toBe('code');
    expect(appCategory('iTerm')).toBe('code');
    expect(appCategory('Xcode')).toBe('code');
    expect(appCategory('IntelliJ IDEA')).toBe('code');
    expect(appCategory('Figma')).toBe('creative');
    expect(appCategory('Notion')).toBe('creative');
    expect(appCategory('Linear')).toBe('creative');
    expect(appCategory('Obsidian')).toBe('creative');
    expect(appCategory('Slack')).toBe('comm');
    expect(appCategory('Discord')).toBe('comm');
    expect(appCategory('Mail')).toBe('comm');
    expect(appCategory('Gmail')).toBe('comm');
    expect(appCategory('Messages')).toBe('comm');
    expect(appCategory('Zoom')).toBe('meeting');
    expect(appCategory('Google Meet')).toBe('meeting');
    expect(appCategory('Microsoft Teams')).toBe('meeting');
    expect(appCategory('Chrome')).toBe('browse');
    expect(appCategory('Safari')).toBe('browse');
    expect(appCategory('Arc')).toBe('browse');
    expect(appCategory('Firefox')).toBe('browse');
  });

  it('APP_CATEGORY keys are all lowercase', () => {
    for (const key of Object.keys(APP_CATEGORY)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/categories.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/categories.ts`**

Create `app/src/lib/categories.ts`:

```ts
import type { Category } from '../types';

export const APP_CATEGORY: Readonly<Record<string, Category>> = {
  'vs code': 'code',
  'cursor': 'code',
  'xcode': 'code',
  'intellij idea': 'code',
  'iterm': 'code',
  'terminal': 'code',
  'warp': 'code',
  'figma': 'creative',
  'notion': 'creative',
  'linear': 'creative',
  'obsidian': 'creative',
  'slack': 'comm',
  'discord': 'comm',
  'mail': 'comm',
  'gmail': 'comm',
  'messages': 'comm',
  'zoom': 'meeting',
  'google meet': 'meeting',
  'microsoft teams': 'meeting',
  'chrome': 'browse',
  'safari': 'browse',
  'arc': 'browse',
  'firefox': 'browse',
};

export function appCategory(
  app: string,
  overrides?: Record<string, Category>,
): Category {
  const key = app.toLowerCase();
  if (overrides) {
    const o = overrides[key];
    if (o) return o;
  }
  return APP_CATEGORY[key] ?? 'browse';
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/categories.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/categories.ts app/src/test/lib/categories.test.ts
git commit -m "feat(lib): add categories.ts — APP_CATEGORY defaults + appCategory()"
```

---

## Task 1.6: Create `lib/web-categories.ts` with TDD

**Files:**
- Create: `app/src/lib/web-categories.ts`
- Create: `app/src/test/lib/web-categories.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/web-categories.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_META,
  domainCategory,
  domainFavicon,
  extractDomain,
} from '../../lib/web-categories';

describe('extractDomain', () => {
  it('strips scheme', () => {
    expect(extractDomain('https://github.com/foo/bar')).toBe('github.com');
    expect(extractDomain('http://github.com')).toBe('github.com');
  });

  it('strips www. prefix', () => {
    expect(extractDomain('https://www.github.com')).toBe('github.com');
  });

  it('strips path and query', () => {
    expect(extractDomain('https://github.com/foo/bar?baz=1#q')).toBe('github.com');
  });

  it('strips port', () => {
    expect(extractDomain('http://localhost:5173/today')).toBe('localhost');
  });

  it('returns the input unchanged when it is already a bare domain', () => {
    expect(extractDomain('github.com')).toBe('github.com');
  });

  it('lowercases', () => {
    expect(extractDomain('https://GitHub.COM/foo')).toBe('github.com');
  });
});

describe('domainCategory', () => {
  it('returns the known category', () => {
    expect(domainCategory('github.com')).toBe('Code');
    expect(domainCategory('figma.com')).toBe('Work');
    expect(domainCategory('slack.com')).toBe('Comms');
    expect(domainCategory('claude.ai')).toBe('AI');
  });

  it('returns "Other" for unknown domains', () => {
    expect(domainCategory('totally-unknown.example')).toBe('Other');
  });
});

describe('domainFavicon', () => {
  it('returns the known favicon glyph', () => {
    expect(domainFavicon('github.com')).toBe('GH');
    expect(domainFavicon('figma.com')).toBe('F');
  });

  it('falls back to first letter uppercased for unknowns', () => {
    expect(domainFavicon('totally-unknown.example')).toBe('T');
    expect(domainFavicon('')).toBe('?');
  });
});

describe('DOMAIN_META', () => {
  it('has all known seed domains', () => {
    const required = [
      'github.com',
      'stackoverflow.com',
      'developer.mozilla.org',
      'vercel.com',
      'npmjs.com',
      'linear.app',
      'notion.so',
      'figma.com',
      'mail.google.com',
      'calendar.google.com',
      'docs.google.com',
      'slack.com',
      'zoom.us',
      'news.ycombinator.com',
      'reddit.com',
      'twitter.com',
      'youtube.com',
      'netflix.com',
      'spotify.com',
      'amazon.com',
      'claude.ai',
      'chat.openai.com',
      'perplexity.ai',
      'nytimes.com',
      'wikipedia.org',
    ];
    for (const d of required) {
      expect(DOMAIN_META[d]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/web-categories.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/web-categories.ts`**

Create `app/src/lib/web-categories.ts`:

```ts
import type { DomainMeta, WebCategory } from '../types';

export const DOMAIN_META: Readonly<Record<string, DomainMeta>> = {
  'github.com':            { cat: 'Code',          favicon: 'GH' },
  'stackoverflow.com':     { cat: 'Code',          favicon: 'SO' },
  'developer.mozilla.org': { cat: 'Docs',          favicon: 'MDN' },
  'vercel.com':            { cat: 'Code',          favicon: '▲' },
  'npmjs.com':             { cat: 'Code',          favicon: 'np' },
  'linear.app':            { cat: 'Work',          favicon: '≡' },
  'notion.so':             { cat: 'Work',          favicon: 'N' },
  'figma.com':             { cat: 'Work',          favicon: 'F' },
  'mail.google.com':       { cat: 'Comms',         favicon: 'M' },
  'calendar.google.com':   { cat: 'Work',          favicon: '31' },
  'docs.google.com':       { cat: 'Work',          favicon: 'D' },
  'slack.com':             { cat: 'Comms',         favicon: 'S' },
  'zoom.us':               { cat: 'Comms',         favicon: 'Z' },
  'news.ycombinator.com':  { cat: 'News',          favicon: 'Y' },
  'reddit.com':            { cat: 'Social',        favicon: 'r' },
  'twitter.com':           { cat: 'Social',        favicon: '𝕏' },
  'youtube.com':           { cat: 'Entertainment', favicon: '▶' },
  'netflix.com':           { cat: 'Entertainment', favicon: 'N' },
  'spotify.com':           { cat: 'Entertainment', favicon: '♫' },
  'amazon.com':            { cat: 'Shopping',      favicon: 'a' },
  'claude.ai':             { cat: 'AI',            favicon: '✶' },
  'chat.openai.com':       { cat: 'AI',            favicon: '◉' },
  'perplexity.ai':         { cat: 'AI',            favicon: 'P' },
  'nytimes.com':            { cat: 'News',         favicon: 'T' },
  'wikipedia.org':         { cat: 'Docs',          favicon: 'W' },
};

export function extractDomain(urlOrDomain: string): string {
  try {
    const u = new URL(urlOrDomain);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlOrDomain.replace(/^www\./i, '').toLowerCase();
  }
}

export function domainCategory(domain: string): WebCategory {
  return DOMAIN_META[domain]?.cat ?? 'Other';
}

export function domainFavicon(domain: string): string {
  const meta = DOMAIN_META[domain];
  if (meta) return meta.favicon;
  if (!domain) return '?';
  return domain[0].toUpperCase();
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/web-categories.test.ts
```

Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/web-categories.ts app/src/test/lib/web-categories.test.ts
git commit -m "feat(lib): add web-categories.ts — DOMAIN_META + extractDomain/domainCategory/domainFavicon"
```

---

## Task 1.7: Extend `lib/activitywatch.ts` with Web bucket support

**Files:**
- Modify: `app/src/lib/activitywatch.ts`
- Create: `app/src/test/lib/activitywatch.test.ts` (new — current tests live only in component tests)

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/activitywatch.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';

describe('findWebBucket', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the first aw-watcher-web bucket id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              'aw-watcher-window_host': {
                id: 'aw-watcher-window_host',
                client: 'aw-watcher-window',
                type: 'currentwindow',
                hostname: 'host',
              },
              'aw-watcher-web-chrome_host': {
                id: 'aw-watcher-web-chrome_host',
                client: 'aw-watcher-web',
                type: 'web.tab.current',
                hostname: 'host',
              },
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    expect(await findWebBucket()).toBe('aw-watcher-web-chrome_host');
  });

  it('returns null when no aw-watcher-web bucket exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    );
    expect(await findWebBucket()).toBeNull();
  });
});

describe('fetchWebEvents', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the event array from the AW response', async () => {
    const events = [
      {
        id: 1,
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 60,
        data: { url: 'https://github.com', title: 'GitHub' },
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(events), { status: 200 })),
      ),
    );
    const got = await fetchWebEvents(
      'aw-watcher-web-chrome_host',
      '2026-04-18T00:00:00.000Z',
      '2026-04-19T00:00:00.000Z',
    );
    expect(got).toHaveLength(1);
    expect(got[0].data.url).toBe('https://github.com');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/activitywatch.test.ts
```

Expected: FAIL — `findWebBucket` / `fetchWebEvents` not exported.

- [ ] **Step 3: Extend `lib/activitywatch.ts`**

Append to `app/src/lib/activitywatch.ts`:

```ts
import type { WebEvent } from '../types';

export async function findWebBucket(): Promise<string | null> {
  const buckets = await listBuckets();
  const match = Object.values(buckets).find(
    (b) => b.client === 'aw-watcher-web',
  );
  return match?.id ?? null;
}

export async function fetchWebEvents(
  bucketId: string,
  startIso: string,
  endIso: string,
): Promise<WebEvent[]> {
  const params = new URLSearchParams({
    start: startIso,
    end: endIso,
    limit: '5000',
  });
  return request<WebEvent[]>(
    `/buckets/${encodeURIComponent(bucketId)}/events?${params.toString()}`,
  );
}
```

Note: the existing `AWEvent` import already re-exports everything it needs. The new `WebEvent` import adds the second type. No other changes to existing functions.

- [ ] **Step 4: Run to verify the new test passes and the old behavior is intact**

```bash
npm run test:run -- src/test/lib/activitywatch.test.ts
npm run test:run -- src/test/lib/
```

Expected: 3 new tests PASS; all existing lib tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/activitywatch.ts app/src/test/lib/activitywatch.test.ts
git commit -m "feat(aw): add findWebBucket() + fetchWebEvents() for aw-watcher-web"
```

---

## Task 1.8: Update `store/useStore.ts`

**Files:**
- Modify: `app/src/store/useStore.ts`
- Create: `app/src/test/store/useStore.test.ts` (new — current store isn't unit-tested directly)

Actions to land: add `renameSession`, `refreshWebBucket`. Add state field `categoryOverrides`. Remove `setAppOrder`, `importJson`, `exportJson`. Extend `Settings` default with `webBucketId: null`.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/store/useStore.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('renameSession', () => {
  it('updates the session name', async () => {
    await useStore.getState().startTask('Original');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, 'Renamed');
    const session = useStore.getState().sessions.find((s) => s.id === id)!;
    expect(session.name).toBe('Renamed');
  });

  it('trims whitespace', async () => {
    await useStore.getState().startTask('Task');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, '  Trimmed  ');
    expect(useStore.getState().sessions.find((s) => s.id === id)!.name).toBe('Trimmed');
  });

  it('is a no-op on empty or whitespace-only names', async () => {
    await useStore.getState().startTask('Keep');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, '   ');
    expect(useStore.getState().sessions.find((s) => s.id === id)!.name).toBe('Keep');
  });

  it('is a no-op on unknown id', async () => {
    await useStore.getState().startTask('Keep');
    useStore.getState().renameSession('nonexistent', 'Whatever');
    expect(useStore.getState().sessions[0].name).toBe('Keep');
  });
});

describe('settings.webBucketId', () => {
  it('defaults to null', () => {
    expect(useStore.getState().settings.webBucketId).toBeNull();
  });
});

describe('categoryOverrides', () => {
  it('defaults to an empty object', () => {
    expect(useStore.getState().categoryOverrides).toEqual({});
  });
});

describe('removed actions', () => {
  it('does not expose setAppOrder', () => {
    expect((useStore.getState() as Record<string, unknown>).setAppOrder).toBeUndefined();
  });
  it('does not expose importJson / exportJson', () => {
    expect((useStore.getState() as Record<string, unknown>).importJson).toBeUndefined();
    expect((useStore.getState() as Record<string, unknown>).exportJson).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/store/useStore.test.ts
```

Expected: FAIL — `renameSession`, `categoryOverrides`, `settings.webBucketId` don't exist; `setAppOrder`/`importJson`/`exportJson` still exposed.

- [ ] **Step 3: Replace `src/store/useStore.ts`**

Write `app/src/store/useStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Settings, TaskSession } from '../types';
import {
  ActivityWatchError,
  fetchEvents,
  findWebBucket,
  findWindowBucket,
} from '../lib/activitywatch';

type StoreState = {
  sessions: TaskSession[];
  activeSessionId: string | null;
  settings: Settings;
  categoryOverrides: Record<string, Category>;
  startTask: (name: string) => Promise<void>;
  stopActive: () => Promise<void>;
  renameSession: (id: string, name: string) => void;
  refreshBucket: () => Promise<void>;
  refreshWebBucket: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

const DEFAULT_SETTINGS: Settings = {
  bucketId: null,
  webBucketId: null,
  lastError: null,
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      settings: DEFAULT_SETTINGS,
      categoryOverrides: {},

      async startTask(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (get().activeSessionId) {
          await get().stopActive();
        }
        const session: TaskSession = {
          id: newId(),
          name: trimmed,
          startedAt: new Date().toISOString(),
          endedAt: null,
          events: [],
        };
        set((s) => ({
          sessions: [...s.sessions, session],
          activeSessionId: session.id,
        }));
      },

      async stopActive() {
        const state = get();
        const activeId = state.activeSessionId;
        if (!activeId) return;
        const active = state.sessions.find((s) => s.id === activeId);
        if (!active) {
          set({ activeSessionId: null });
          return;
        }
        const endedAt = new Date().toISOString();
        let bucketId = state.settings.bucketId;
        let lastError: string | null = null;
        let events: TaskSession['events'] = [];
        try {
          if (!bucketId) {
            bucketId = await findWindowBucket();
          }
          if (bucketId) {
            events = await fetchEvents(bucketId, active.startedAt, endedAt);
          } else {
            lastError = 'No aw-watcher-window bucket found';
          }
        } catch (err) {
          lastError =
            err instanceof ActivityWatchError
              ? err.message
              : (err as Error).message;
        }
        set((s) => ({
          activeSessionId: null,
          settings: { ...s.settings, bucketId, lastError },
          sessions: s.sessions.map((sess) =>
            sess.id === activeId ? { ...sess, endedAt, events } : sess,
          ),
        }));
      },

      renameSession(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, name: trimmed } : sess,
          ),
        }));
      },

      async refreshBucket() {
        try {
          const bucketId = await findWindowBucket();
          set((s) => ({
            settings: { ...s.settings, bucketId, lastError: null },
          }));
        } catch (err) {
          set((s) => ({
            settings: {
              ...s.settings,
              lastError:
                err instanceof ActivityWatchError
                  ? err.message
                  : (err as Error).message,
            },
          }));
        }
      },

      async refreshWebBucket() {
        try {
          const webBucketId = await findWebBucket();
          set((s) => ({
            settings: { ...s.settings, webBucketId },
          }));
        } catch (err) {
          set((s) => ({
            settings: {
              ...s.settings,
              lastError:
                err instanceof ActivityWatchError
                  ? err.message
                  : (err as Error).message,
            },
          }));
        }
      },

      clearError() {
        set((s) => ({ settings: { ...s.settings, lastError: null } }));
      },

      reset() {
        set({
          sessions: [],
          activeSessionId: null,
          settings: DEFAULT_SETTINGS,
          categoryOverrides: {},
        });
      },
    }),
    {
      name: 'buildtimetracker:v1',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        settings: state.settings,
        categoryOverrides: state.categoryOverrides,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          categoryOverrides: p.categoryOverrides ?? {},
        };
      },
    },
  ),
);
```

Notes:
- `DEFAULT_SETTINGS` centralises the shape; `merge` ensures old localStorage data (without `webBucketId`) gets filled in.
- `setAppOrder`, `importJson`, `exportJson` are gone.
- `renameSession` trims and no-ops on empty or unknown id.

- [ ] **Step 4: Run the new store tests and all existing tests to verify**

```bash
npm run test:run -- src/test/store/useStore.test.ts
```

Expected: PASS — 8 tests.

```bash
npm run test:run
```

Expected: existing `src/test/components/*.test.tsx` and `src/test/lib/*.test.ts` may have failures where components reference `setAppOrder`, `importJson`, or `TaskSession.appOrder`. That's acceptable for now — those components and their tests are deleted in Phase 7. Only the **lib** and **store** tests must pass. Note which component tests fail for reference.

- [ ] **Step 5: Type-check the library and store**

Run:

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "(src/lib|src/store)" | head -20
```

Expected: 0 lines — no TS errors originating from `src/lib/` or `src/store/`. Errors from `src/components/` and `src/test/components/` are expected and will be resolved in Phase 7.

- [ ] **Step 6: Commit**

```bash
git add app/src/store/useStore.ts app/src/test/store/useStore.test.ts
git commit -m "feat(store): add renameSession, refreshWebBucket, categoryOverrides; drop setAppOrder/importJson/exportJson"
```

---

## Phase 1 exit checklist

Run at the very end of this phase:

- [ ] `npm run test:run -- src/test/lib/ src/test/store/` passes fully.
- [ ] `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -Ev "src/components|src/test/components" | grep "error TS"` prints nothing.
- [ ] Commit log contains 8 commits, one per task.

Phase 2 (Shell) picks up here.
