# Direction D Rebuild — Phase 5: Week tab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Week tab: 7-day timeline of colored segments per day, a focus sparkline, and a right-hand "what you shipped" list with hover-cross-highlighting.

**Architecture:** `WeekPage` owns `hoveredTaskId`. `DayRow` renders one day's segments between 8am and 8pm. `FocusSparkline` is a small SVG. `ShippedList` shows completed tasks grouped by day. Hover syncs through a single piece of state.

**Tech Stack:** React 18, Tailwind, Vitest + @testing-library/react. No new deps.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

**Preconditions:** Phases 1–4 merged.

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

---

## Task 5.0: Add `lib/week.ts` — date helpers

The Week view needs `startOfWeek`, `addDays`, and `dayKey` helpers. The current `lib/time.ts` has `sameLocalDay` and `startOfLocalDay` but not week-level helpers.

**Files:**
- Create: `app/src/lib/week.ts`
- Create: `app/src/test/lib/week.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/week.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { startOfWeek, addDays, dayKey, weekDays } from '../../lib/week';

describe('startOfWeek', () => {
  it('returns Monday 00:00:00 for a mid-week date', () => {
    // Saturday 2026-04-18 → Monday 2026-04-13
    const sat = new Date(2026, 3, 18, 17, 30);
    const mon = startOfWeek(sat);
    expect(mon.getFullYear()).toBe(2026);
    expect(mon.getMonth()).toBe(3);
    expect(mon.getDate()).toBe(13);
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
  });

  it('handles Sunday (rolls back to previous Monday)', () => {
    // Sunday 2026-04-19 → Monday 2026-04-13
    const sun = new Date(2026, 3, 19, 12, 0);
    const mon = startOfWeek(sun);
    expect(mon.getDate()).toBe(13);
  });

  it('handles Monday (returns same day)', () => {
    const mon = new Date(2026, 3, 13, 15, 0);
    const got = startOfWeek(mon);
    expect(got.getDate()).toBe(13);
    expect(got.getHours()).toBe(0);
  });
});

describe('addDays', () => {
  it('adds whole days preserving the time-of-day of input date', () => {
    const a = new Date(2026, 3, 13, 15, 30);
    const b = addDays(a, 2);
    expect(b.getDate()).toBe(15);
    expect(b.getHours()).toBe(15);
  });
});

describe('dayKey', () => {
  it('returns YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 3, 13, 23, 59);
    expect(dayKey(d)).toBe('2026-04-13');
  });
});

describe('weekDays', () => {
  it('returns 7 entries Mon-Sun with date, name, shortDate, key', () => {
    const mon = new Date(2026, 3, 13);
    const days = weekDays(mon);
    expect(days).toHaveLength(7);
    expect(days[0].name).toBe('Mon');
    expect(days[6].name).toBe('Sun');
    expect(days[0].key).toBe('2026-04-13');
    expect(days[6].key).toBe('2026-04-19');
    expect(days[0].shortDate).toMatch(/Apr\s*13/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/week.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/lib/week.ts`:

```ts
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  // Monday-indexed week: if getDay() === 0 (Sunday) → 6 days back, else getDay()-1
  const dow = copy.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function dayKey(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type DayEntry = {
  date: Date;
  key: string;
  name: string;
  shortDate: string;
};

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekDays(monday: Date): DayEntry[] {
  return NAMES.map((name, i) => {
    const date = addDays(monday, i);
    return {
      date,
      key: dayKey(date),
      name,
      shortDate: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
  });
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/week.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/week.ts app/src/test/lib/week.test.ts
git commit -m "feat(lib): add week.ts — startOfWeek, addDays, dayKey, weekDays"
```

---

## Task 5.1: `features/week/DayRow.tsx`

**Files:**
- Create: `app/src/features/week/DayRow.tsx`
- Create: `app/src/test/features/week/DayRow.test.tsx`

One row per day: day label, 8am-8pm timeline of colored segments, right-side focus badge + total-tracked.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/week/DayRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayRow } from '../../../features/week/DayRow';
import type { TaskSession } from '../../../types';

function session(
  id: string,
  name: string,
  startedAt: string,
  endedAt: string | null,
  app = 'VS Code',
): TaskSession {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : start + 3600000;
  return {
    id,
    name,
    startedAt,
    endedAt,
    events: [
      {
        id: 1,
        timestamp: startedAt,
        duration: Math.max(1, (end - start) / 1000),
        data: { app, title: name },
      },
    ],
  };
}

describe('DayRow', () => {
  it('renders the day name and short date', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Apr 15')).toBeInTheDocument();
  });

  it('renders "No sessions" when sessions is empty', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText(/No sessions/i)).toBeInTheDocument();
  });

  it('fires onHover when a segment is hovered', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    const s = session('s1', 'Task', '2026-04-15T10:00:00.000Z', '2026-04-15T11:00:00.000Z');
    const { container } = render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[s]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={onHover}
        focusScore={0.6}
        totalSec={3600}
      />,
    );
    const seg = container.querySelector('[data-seg]')!;
    await user.hover(seg as HTMLElement);
    expect(onHover).toHaveBeenCalledWith('s1');
  });

  it('renders the "Today" label when isToday is true', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 18),
          key: '2026-04-18',
          name: 'Sat',
          shortDate: 'Apr 18',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={true}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/week/DayRow.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/week/DayRow.tsx`:

```tsx
import type { TaskSession } from '../../types';
import { toSegments } from '../../lib/segments';
import { appColor } from '../../lib/colors';
import { formatDurationShort } from '../../lib/time';
import type { DayEntry } from '../../lib/week';

const HOUR_START = 8;
const HOUR_END = 20;
const RANGE_MS = (HOUR_END - HOUR_START) * 3600 * 1000;

export type DayRowProps = {
  day: DayEntry;
  sessions: TaskSession[];
  nowMs: number;
  isToday: boolean;
  hoveredTaskId: string | null;
  onHover: (id: string | null) => void;
  focusScore: number | null;
  totalSec: number;
};

export function DayRow({
  day,
  sessions,
  isToday,
  hoveredTaskId,
  onHover,
  focusScore,
  totalSec,
}: DayRowProps) {
  const dayFromMs = day.date.getTime() + HOUR_START * 3600 * 1000;

  const segs = sessions.flatMap((s) =>
    toSegments(s.events).map((seg) => ({ ...seg, sessionId: s.id, sessionName: s.name })),
  );

  const focusCls =
    focusScore == null
      ? 'text-muted-2'
      : focusScore >= 0.7
        ? 'text-good'
        : focusScore >= 0.5
          ? 'text-warn'
          : 'text-bad';

  return (
    <div
      className={[
        'grid grid-cols-[80px_1fr_120px] gap-3 items-center py-2',
        isToday ? 'bg-accent/5 -mx-3 px-3 rounded' : '',
      ].join(' ')}
    >
      <div>
        <div
          className={[
            'font-medium text-sm',
            isToday ? 'text-accent' : 'text-ink-2',
          ].join(' ')}
        >
          {isToday ? 'Today' : day.name}
        </div>
        <div className="text-[11px] text-muted">{day.shortDate}</div>
      </div>

      <div className="relative h-6 rounded bg-bg-1 border border-line overflow-hidden">
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">
            No sessions
          </div>
        )}
        {segs.map((seg, i) => {
          const l = Math.max(0, ((seg.start - dayFromMs) / RANGE_MS) * 100);
          const w = Math.min(
            100 - l,
            ((seg.end - seg.start) / RANGE_MS) * 100,
          );
          if (w <= 0 || l >= 100) return null;
          const highlighted = hoveredTaskId === seg.sessionId;
          return (
            <div
              key={i}
              data-seg
              className={[
                'absolute top-0 bottom-0 cursor-pointer transition-[filter]',
                highlighted ? 'brightness-[1.4]' : '',
                hoveredTaskId && !highlighted ? 'brightness-50 saturate-50' : '',
              ].join(' ')}
              style={{
                left: `${l}%`,
                width: `${Math.max(0.4, w)}%`,
                background: appColor(seg.app),
              }}
              title={`${seg.sessionName} · ${seg.app}`}
              onMouseEnter={() => onHover(seg.sessionId)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span
          className={[
            'font-mono text-xs font-medium px-2 py-0.5 rounded border',
            focusScore == null
              ? 'border-line text-muted-2'
              : 'border-line-2',
            focusCls,
          ].join(' ')}
        >
          {focusScore != null ? Math.round(focusScore * 100) : '—'}
        </span>
        <span className="font-mono text-xs text-ink-2 w-14 text-right">
          {totalSec > 0 ? formatDurationShort(totalSec) : ''}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/week/DayRow.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/week/DayRow.tsx app/src/test/features/week/DayRow.test.tsx
git commit -m "feat(week): DayRow — day label, 8am-8pm timeline segs, focus badge, total"
```

---

## Task 5.2: `features/week/FocusSparkline.tsx`

**Files:**
- Create: `app/src/features/week/FocusSparkline.tsx`
- Create: `app/src/test/features/week/FocusSparkline.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/week/FocusSparkline.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FocusSparkline } from '../../../features/week/FocusSparkline';

describe('FocusSparkline', () => {
  it('renders nothing when every value is null', () => {
    const { container } = render(
      <FocusSparkline values={[null, null, null]} labels={['a', 'b', 'c']} />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders one dot per non-null value', () => {
    const { container } = render(
      <FocusSparkline values={[0.7, 0.8, null, 0.6]} labels={['a', 'b', 'c', 'd']} />,
    );
    const circles = container.querySelectorAll('svg circle');
    expect(circles.length).toBe(3);
  });

  it('renders labels', () => {
    render(
      <FocusSparkline values={[0.7]} labels={['Mon']} />,
    );
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/week/FocusSparkline.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/week/FocusSparkline.tsx`:

```tsx
export type FocusSparklineProps = {
  values: (number | null)[];
  labels: string[];
  todayIndex?: number;
};

const W = 500;
const H = 60;
const PAD = 10;

export function FocusSparkline({ values, labels, todayIndex }: FocusSparklineProps) {
  const points = values
    .map((v, i) => {
      if (v == null) return null;
      const x = PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - v * (H - PAD * 2);
      return { x, y, v };
    })
    .filter((p): p is { x: number; y: number; v: number } => p !== null);

  if (points.length === 0) return null;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[60px]"
      >
        <line
          x1={PAD}
          y1={H - PAD - 0.7 * (H - PAD * 2)}
          x2={W - PAD}
          y2={H - PAD - 0.7 * (H - PAD * 2)}
          stroke="var(--tw-colors-line, #23272f)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={p.v >= 0.7 ? '#6ee7a7' : p.v >= 0.5 ? '#fbbf24' : '#f87171'}
            stroke="#111318"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex mt-1.5">
        {labels.map((l, i) => (
          <span
            key={i}
            className={[
              'flex-1 text-center text-[11px]',
              i === todayIndex ? 'text-accent' : 'text-muted',
            ].join(' ')}
          >
            {i === todayIndex ? 'Today' : l}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/week/FocusSparkline.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/week/FocusSparkline.tsx app/src/test/features/week/FocusSparkline.test.tsx
git commit -m "feat(week): FocusSparkline — 7-point SVG trend line"
```

---

## Task 5.3: `features/week/ShippedList.tsx`

**Files:**
- Create: `app/src/features/week/ShippedList.tsx`
- Create: `app/src/test/features/week/ShippedList.test.tsx`

Right column. For each day that has completed tasks, shows a header with the day label + task count, then a row per completed task (✓ check + name + dur + top app).

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/week/ShippedList.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShippedList } from '../../../features/week/ShippedList';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeCompleted(id: string, name: string, startIso: string, endIso: string): TaskSession {
  return {
    id,
    name,
    startedAt: startIso,
    endedAt: endIso,
    events: [
      {
        id: 1,
        timestamp: startIso,
        duration: (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000,
        data: { app: 'VS Code', title: name },
      },
    ],
  };
}

describe('ShippedList', () => {
  it('renders empty state when no tasks', () => {
    render(<ShippedList days={[]} nowMs={NOW} hoveredTaskId={null} onHover={() => {}} />);
    expect(screen.getByText(/Nothing shipped yet/i)).toBeInTheDocument();
  });

  it('groups tasks by day and shows task counts', () => {
    render(
      <ShippedList
        days={[
          {
            day: {
              date: new Date(2026, 3, 18),
              key: '2026-04-18',
              name: 'Sat',
              shortDate: 'Apr 18',
            },
            sessions: [
              makeCompleted(
                't1',
                'Task 1',
                '2026-04-18T09:00:00.000Z',
                '2026-04-18T10:00:00.000Z',
              ),
              makeCompleted(
                't2',
                'Task 2',
                '2026-04-18T11:00:00.000Z',
                '2026-04-18T12:00:00.000Z',
              ),
            ],
            isToday: true,
          },
        ]}
        nowMs={NOW}
        hoveredTaskId={null}
        onHover={() => {}}
      />,
    );
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText(/2 tasks/)).toBeInTheDocument();
  });

  it('fires onHover when a task row is hovered', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    render(
      <ShippedList
        days={[
          {
            day: {
              date: new Date(2026, 3, 17),
              key: '2026-04-17',
              name: 'Fri',
              shortDate: 'Apr 17',
            },
            sessions: [
              makeCompleted(
                't1',
                'Ship it',
                '2026-04-17T09:00:00.000Z',
                '2026-04-17T10:00:00.000Z',
              ),
            ],
            isToday: false,
          },
        ]}
        nowMs={NOW}
        hoveredTaskId={null}
        onHover={onHover}
      />,
    );
    await user.hover(screen.getByText('Ship it'));
    expect(onHover).toHaveBeenCalledWith('t1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/week/ShippedList.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/week/ShippedList.tsx`:

```tsx
import type { TaskSession } from '../../types';
import type { DayEntry } from '../../lib/week';
import { groupByApp } from '../../lib/aggregation';
import { appColor } from '../../lib/colors';
import { formatDurationShort } from '../../lib/time';
import { sessionDurationSec } from '../../lib/focus';

export type ShippedDay = {
  day: DayEntry;
  sessions: TaskSession[];
  isToday: boolean;
};

export type ShippedListProps = {
  days: ShippedDay[];
  nowMs: number;
  hoveredTaskId: string | null;
  onHover: (id: string | null) => void;
};

export function ShippedList({ days, nowMs, hoveredTaskId, onHover }: ShippedListProps) {
  const hasAny = days.some((d) => d.sessions.some((s) => s.endedAt));
  if (!hasAny) {
    return (
      <div className="text-sm text-muted py-8 text-center">
        Nothing shipped yet this week.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((d) => {
        const completed = d.sessions.filter((s) => s.endedAt);
        if (completed.length === 0) return null;
        return (
          <section key={d.day.key}>
            <header className="flex items-center justify-between mb-2 text-[11px] tracking-[0.1em] uppercase">
              <span className={d.isToday ? 'text-accent' : 'text-muted'}>
                {d.isToday ? 'Today' : `${d.day.name}, ${d.day.shortDate}`}
              </span>
              <span className="text-muted-2">{completed.length} tasks</span>
            </header>
            <ul className="flex flex-col gap-1 list-none p-0 m-0">
              {completed.map((s) => {
                const dur = sessionDurationSec(s, nowMs);
                const top = groupByApp(
                  s.events,
                  s.startedAt,
                  s.endedAt!,
                )[0];
                const highlighted = hoveredTaskId === s.id;
                return (
                  <li
                    key={s.id}
                    className={[
                      'flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
                      highlighted ? 'bg-bg-2' : 'hover:bg-bg-1',
                    ].join(' ')}
                    onMouseEnter={() => onHover(s.id)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <span className="text-good shrink-0" aria-hidden>✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-2 truncate">{s.name}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5">
                        <span className="font-mono">{formatDurationShort(dur)}</span>
                        {top && (
                          <>
                            <span className="text-muted-2">·</span>
                            <span style={{ color: appColor(top.app) }}>
                              {top.app}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/week/ShippedList.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/week/ShippedList.tsx app/src/test/features/week/ShippedList.test.tsx
git commit -m "feat(week): ShippedList — per-day grouped completed tasks with hover sync"
```

---

## Task 5.4: `features/week/WeekPage.tsx` — full wiring

**Files:**
- Modify: `app/src/features/week/WeekPage.tsx` (replace Phase 2 placeholder)
- Create: `app/src/test/features/week/WeekPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/week/WeekPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeekPage } from '../../../features/week/WeekPage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  // Freeze "now" to Saturday 2026-04-18 12:00 local so weekDays() / "Today"
  // label are deterministic. Surgical: mock only Date.now, no fake timers.
  vi.spyOn(Date, 'now').mockReturnValue(
    new Date(2026, 3, 18, 12, 0, 0).getTime(),
  );
});
// No afterEach — global setup.ts's vi.clearAllMocks() restores spies.

describe('WeekPage', () => {
  it('renders the week header and three summary stats', () => {
    render(
      <MemoryRouter>
        <WeekPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/This week/i)).toBeInTheDocument();
    expect(screen.getByText(/Total tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Tasks completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg focus/i)).toBeInTheDocument();
  });

  it('renders 7 day rows with names Mon through Sun', () => {
    render(
      <MemoryRouter>
        <WeekPage />
      </MemoryRouter>,
    );
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'].forEach((n) => {
      expect(screen.getByText(n)).toBeInTheDocument();
    });
    // "Today" label replaces Sat when "now" is Saturday
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders the shipped-list empty state when no completed tasks', () => {
    render(
      <MemoryRouter>
        <WeekPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nothing shipped yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/week/WeekPage.test.tsx
```

Expected: FAIL — placeholder WeekPage doesn't render these strings.

- [ ] **Step 3: Implement**

Replace `app/src/features/week/WeekPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { startOfWeek, weekDays, dayKey } from '../../lib/week';
import { sessionDurationSec, dayFocusScore, focusScore } from '../../lib/focus';
import { formatDurationShort } from '../../lib/time';
import { DayRow } from './DayRow';
import { ShippedList } from './ShippedList';
import { FocusSparkline } from './FocusSparkline';
import type { TaskSession } from '../../types';

function sessionsInDay(sessions: TaskSession[], dayKeyVal: string): TaskSession[] {
  return sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key === dayKeyVal;
  });
}

export function WeekPage() {
  const allSessions = useStore((s) => s.sessions);
  const nowMs = Date.now();
  const now = new Date(nowMs);

  const monday = useMemo(() => startOfWeek(now), [nowMs]);
  const days = useMemo(() => weekDays(monday), [monday]);
  const today = dayKey(now);

  const perDay = useMemo(
    () =>
      days.map((d) => {
        const sessions = sessionsInDay(allSessions, d.key);
        const totalSec = sessions.reduce(
          (a, s) => a + sessionDurationSec(s, nowMs),
          0,
        );
        const scores = sessions
          .map((s) => focusScore(s, nowMs))
          .filter((x): x is number => x != null);
        const focus =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        const dayScore = dayFocusScore(sessions, nowMs);
        return {
          day: d,
          sessions,
          totalSec,
          focus: focus ?? (sessions.length === 0 ? null : dayScore),
          isToday: d.key === today,
        };
      }),
    [days, allSessions, nowMs, today],
  );

  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const totalTracked = perDay.reduce((a, d) => a + d.totalSec, 0);
  const totalTasks = perDay
    .flatMap((d) => d.sessions)
    .filter((s) => s.endedAt).length;
  const validFocus = perDay.map((d) => d.focus).filter((x): x is number => x != null);
  const avgFocus =
    validFocus.length > 0
      ? Math.round((validFocus.reduce((a, b) => a + b, 0) / validFocus.length) * 100)
      : null;

  const todayIdx = days.findIndex((d) => d.key === today);

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-6">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Week of{' '}
            {monday.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            This week
          </h1>
        </div>
        <div className="flex gap-6">
          <SummaryStat label="Total tracked" value={formatDurationShort(totalTracked)} />
          <SummaryStat label="Tasks completed" value={String(totalTasks)} />
          <SummaryStat
            label="Avg focus"
            value={avgFocus != null ? String(avgFocus) : '—'}
            suffix={avgFocus != null ? '/100' : undefined}
          />
        </div>
      </header>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
            Daily timeline · 8 am – 8 pm
          </div>
          <div className="flex flex-col gap-1 mb-8">
            {perDay.map((row) => (
              <DayRow
                key={row.day.key}
                day={row.day}
                sessions={row.sessions}
                nowMs={nowMs}
                isToday={row.isToday}
                hoveredTaskId={hoveredTaskId}
                onHover={setHoveredTaskId}
                focusScore={row.focus}
                totalSec={row.totalSec}
              />
            ))}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Focus trend
            </div>
            <FocusSparkline
              values={perDay.map((d) => d.focus)}
              labels={perDay.map((d) => d.day.name)}
              todayIndex={todayIdx >= 0 ? todayIdx : undefined}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
            What you shipped
          </div>
          <ShippedList
            days={perDay.map((d) => ({
              day: d.day,
              sessions: d.sessions,
              isToday: d.isToday,
            }))}
            nowMs={nowMs}
            hoveredTaskId={hoveredTaskId}
            onHover={setHoveredTaskId}
          />
        </div>
      </div>
    </main>
  );
}

function SummaryStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-2xl text-ink">
        {value}
        {suffix && <span className="text-muted text-base ml-1">{suffix}</span>}
      </span>
      <span className="text-[10px] tracking-[0.14em] uppercase text-muted mt-0.5">
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/week/WeekPage.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Navigate to `/week`:
- Header shows "This week" and 3 summary stats.
- 7 day rows render; today's row is highlighted.
- If you ran tasks in earlier phases, their segments show up in the correct day.
- Hovering a segment dims other days and highlights its task in the right column (and vice versa).
- Focus sparkline renders below.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/week/WeekPage.tsx app/src/test/features/week/WeekPage.test.tsx
git commit -m "feat(week): WeekPage wiring — daily timeline, sparkline, shipped list"
```

---

## Phase 5 exit checklist

- [ ] `npm run test:run -- src/test/features/week/` passes.
- [ ] `npm run test:run -- src/test/lib/week.test.ts` passes.
- [ ] `npm run build` passes.
- [ ] Manual smoke test on `/week` passes.
- [ ] Commit log contains 5 commits (one per task including 5.0).

Phase 6 (Aggregate tab) picks up here.
