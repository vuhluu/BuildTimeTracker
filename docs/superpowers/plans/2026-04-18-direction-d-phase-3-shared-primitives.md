# Direction D Rebuild — Phase 3: Shared primitives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four UI primitives reused across Today/Week/Aggregate/Web: `CommandBar`, `SceneRibbon`/`SceneCard`, `Drawer`/`SceneDrawer`, `KeyHint`. Each is built TDD, styled to match the mock's Direction D, and composable.

**Architecture:** All new files under `app/src/features/shared/`. `CommandBar` and `Drawer` use `createPortal` to render on `document.body`. Components take props; no internal store subscriptions in `SceneCard`/`SceneDrawer` (they're passed `session` objects). `CommandBar` subscribes to the store for task lists.

**Tech Stack:** React 18, Tailwind (theme from Phase 1), Vitest + @testing-library/react + @testing-library/user-event.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

**Preconditions:** Phases 1 and 2 merged.

---

## Task 3.0: Add `formatDurationShort` helper (prerequisite)

The mock uses a short-form duration ("1h 28m", "42m", "13s") in every ribbon/drawer/filmstrip surface. The current `lib/time.ts` has `formatDuration` (HH:MM:SS) but no short variant.

**Files:**
- Modify: `app/src/lib/time.ts`
- Modify: `app/src/test/lib/time.test.ts` (create if missing)

- [ ] **Step 1: Write the failing test**

Create or extend `app/src/test/lib/time.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { formatDurationShort } from '../../lib/time';

describe('formatDurationShort', () => {
  it('formats sub-minute as seconds', () => {
    expect(formatDurationShort(0)).toBe('0s');
    expect(formatDurationShort(42)).toBe('42s');
  });
  it('formats minutes', () => {
    expect(formatDurationShort(60)).toBe('1m');
    expect(formatDurationShort(30 * 60)).toBe('30m');
  });
  it('formats hours with remaining minutes', () => {
    expect(formatDurationShort(3600)).toBe('1h 0m');
    expect(formatDurationShort(3600 + 28 * 60)).toBe('1h 28m');
    expect(formatDurationShort(2 * 3600 + 5 * 60)).toBe('2h 5m');
  });
  it('clamps negatives to 0s', () => {
    expect(formatDurationShort(-5)).toBe('0s');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/time.test.ts
```

Expected: FAIL — `formatDurationShort` not exported.

- [ ] **Step 3: Add the helper**

Append to `app/src/lib/time.ts`:

```ts
export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/time.test.ts
```

Expected: PASS — 4 new tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/time.ts app/src/test/lib/time.test.ts
git commit -m "feat(lib): add formatDurationShort (1h 28m / 42m / 13s)"
```

---

## Task 3.1: `features/shared/KeyHint.tsx` (smallest first)

**Files:**
- Create: `app/src/features/shared/KeyHint.tsx`
- Create: `app/src/test/features/shared/KeyHint.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/KeyHint.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyHint } from '../../../features/shared/KeyHint';

describe('KeyHint', () => {
  it('renders children', () => {
    render(<KeyHint>⌘K search</KeyHint>);
    expect(screen.getByText('⌘K search')).toBeInTheDocument();
  });

  it('applies a fixed-position container', () => {
    const { container } = render(<KeyHint>hi</KeyHint>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('fixed');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/KeyHint.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/shared/KeyHint.tsx`:

```tsx
import type { ReactNode } from 'react';

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-3.5 right-5 z-40 text-[11px] text-muted font-mono bg-bg-1 border border-line rounded-lg px-2.5 py-1.5 opacity-85">
      {children}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#22262e] border border-line-2 text-ink-2">
      {children}
    </kbd>
  );
}
```

Note: `Kbd` ships alongside because the mock uses it inside `KeyHint` and inside the command bar footer; having it co-located keeps the two in sync.

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/KeyHint.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/KeyHint.tsx app/src/test/features/shared/KeyHint.test.tsx
git commit -m "feat(shared): KeyHint + Kbd"
```

---

## Task 3.2: `features/shared/SceneCard.tsx`

**Files:**
- Create: `app/src/features/shared/SceneCard.tsx`
- Create: `app/src/test/features/shared/SceneCard.test.tsx`

`SceneCard` is one item in the day's ribbon: rail, time column, title + mood, colored mini-strip, app swatches, notes footer.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/SceneCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneCard } from '../../../features/shared/SceneCard';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeSession(): TaskSession {
  return {
    id: 's1',
    name: 'Fix timer drift bug',
    startedAt: '2026-04-18T09:50:00.000Z',
    endedAt: '2026-04-18T11:18:00.000Z',
    events: [
      {
        id: 1,
        timestamp: '2026-04-18T09:50:00.000Z',
        duration: 1320,
        data: { app: 'VS Code', title: 'useStore.ts' },
      },
      {
        id: 2,
        timestamp: '2026-04-18T10:12:00.000Z',
        duration: 240,
        data: { app: 'Chrome', title: 'MDN' },
      },
    ],
  };
}

describe('SceneCard', () => {
  it('renders the session name and scene index', () => {
    render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Fix timer drift bug')).toBeInTheDocument();
    expect(screen.getByText(/Scene 01/)).toBeInTheDocument();
  });

  it('renders start time and duration', () => {
    render(
      <SceneCard
        session={makeSession()}
        index={2}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    // Start time displayed in the time column (format: "09:50" or "9:50 am")
    expect(screen.getByText(/9:50/)).toBeInTheDocument();
    // Duration: (11:18 - 9:50) = 88 min = 1h 28m
    expect(screen.getByText(/1h 28m|88m/)).toBeInTheDocument();
  });

  it('fires onClick with session when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={onClick}
      />,
    );
    await user.click(screen.getByText('Fix timer drift bug'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the "selected" style when selected', () => {
    const { container } = render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={true}
        onClick={() => {}}
      />,
    );
    const li = container.querySelector('li')!;
    expect(li.dataset.selected).toBe('true');
  });

  it('carries data-scene-id for keyboard nav', () => {
    const { container } = render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    const li = container.querySelector('li')!;
    expect(li.dataset.sceneId).toBe('s1');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/SceneCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SceneCard`**

Create `app/src/features/shared/SceneCard.tsx`:

```tsx
import { useMemo } from 'react';
import type { TaskSession } from '../../types';
import { groupByApp } from '../../lib/aggregation';
import { longestStretch } from '../../lib/timeline';
import { toSegments } from '../../lib/segments';
import { focusScore, moodClass, sessionDurationSec } from '../../lib/focus';
import { formatClock, formatDurationShort } from '../../lib/time';
import { appColor } from '../../lib/colors';

export type SceneCardProps = {
  session: TaskSession;
  index: number;
  nowMs: number;
  selected: boolean;
  onClick: () => void;
};

export function SceneCard({
  session,
  index,
  nowMs,
  selected,
  onClick,
}: SceneCardProps) {
  const startIso = session.startedAt;
  const endIso = session.endedAt ?? new Date(nowMs).toISOString();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const durSec = sessionDurationSec(session, nowMs);
  const isActive = !session.endedAt;

  const slices = useMemo(
    () => groupByApp(session.events, startIso, endIso),
    [session.events, startIso, endIso],
  );
  const segments = useMemo(() => toSegments(session.events), [session.events]);
  const score = focusScore(session, nowMs) ?? 0;
  const mood = moodClass(score);
  const topApp = slices[0];
  const longest = longestStretch(session.events);
  const switches = Math.max(0, segments.length - 1);

  const moodColor =
    mood === 'deep' ? 'text-good' : mood === 'mixed' ? 'text-warn' : 'text-bad';

  return (
    <li
      data-scene-id={session.id}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      className={[
        'grid grid-cols-[4px_80px_1fr] gap-4 py-4 px-4 border-b border-line cursor-pointer transition-colors',
        'hover:bg-bg-1/40',
        selected ? 'bg-accent/5 ring-1 ring-accent/30' : '',
        isActive ? 'bg-good/5' : '',
      ].join(' ')}
    >
      {/* Rail — vertical strip with top-app colour */}
      <div
        className="w-1 h-full rounded-sm"
        style={{ background: topApp ? appColor(topApp.app) : '#444' }}
      />

      {/* Time column */}
      <div className="text-right font-mono text-[11px] text-muted">
        <div className="text-ink-2">{formatClock(session.startedAt)}</div>
        <div className="mt-0.5">{formatDurationShort(durSec)}</div>
        {session.endedAt && (
          <div className="mt-0.5 text-muted-2">
            {formatClock(session.endedAt)}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.14em] uppercase text-muted">
              Scene {String(index + 1).padStart(2, '0')}
            </div>
            <h3 className="text-base font-medium mt-0.5 truncate flex items-center gap-2">
              {session.name}
              <span className="text-muted-2 font-mono text-sm">›</span>
            </h3>
          </div>
          <div className="text-center shrink-0">
            <div className={`font-mono text-lg font-semibold ${moodColor}`}>
              {Math.round(score * 100)}
            </div>
            <div className="text-[9px] tracking-[0.14em] uppercase text-muted">
              {mood}
            </div>
          </div>
        </div>

        {/* Micro-strip */}
        <div className="relative h-1.5 rounded-sm bg-bg-1 mt-3 overflow-hidden">
          {segments.map((seg, i) => {
            const total = end - start;
            const l = ((seg.start - start) / total) * 100;
            const w = ((seg.end - seg.start) / total) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${l}%`,
                  width: `${w}%`,
                  background: appColor(seg.app),
                }}
                title={`${seg.app}${seg.title ? ` · ${seg.title}` : ''}`}
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <div className="flex items-center gap-3 flex-wrap">
            {slices.slice(0, 3).map((s) => (
              <span key={s.app} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: appColor(s.app) }}
                />
                <span className="text-ink-2">{s.app}</span>
                <span>{s.percent.toFixed(0)}%</span>
              </span>
            ))}
            {slices.length > 3 && (
              <span className="text-muted-2">+{slices.length - 3} more</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {longest && (
              <span>
                Longest:{' '}
                <strong className="text-ink-2">
                  {formatDurationShort(longest.seconds)}
                </strong>{' '}
                in {longest.app}
              </span>
            )}
            <span className="text-muted-2">·</span>
            <span>{switches} switches</span>
          </div>
        </div>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/SceneCard.test.tsx
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/SceneCard.tsx app/src/test/features/shared/SceneCard.test.tsx
git commit -m "feat(shared): SceneCard — ribbon item with rail, mini-strip, mood badge"
```

---

## Task 3.3: `features/shared/SceneRibbon.tsx`

**Files:**
- Create: `app/src/features/shared/SceneRibbon.tsx`
- Create: `app/src/test/features/shared/SceneRibbon.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/SceneRibbon.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneRibbon } from '../../../features/shared/SceneRibbon';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function s(id: string, name: string, startedAt: string, endedAt: string | null): TaskSession {
  return { id, name, startedAt, endedAt, events: [] };
}

describe('SceneRibbon', () => {
  it('renders one SceneCard per session', () => {
    const sessions = [
      s('a', 'Task A', '2026-04-18T09:00:00.000Z', '2026-04-18T10:00:00.000Z'),
      s('b', 'Task B', '2026-04-18T10:30:00.000Z', '2026-04-18T11:30:00.000Z'),
    ];
    render(
      <SceneRibbon
        sessions={sessions}
        selectedId={null}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
  });

  it('renders an empty-state message when no sessions are passed', () => {
    render(
      <SceneRibbon
        sessions={[]}
        selectedId={null}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    expect(screen.getByText(/No tasks yet/i)).toBeInTheDocument();
  });

  it('passes `selected` prop to the matching card', () => {
    const sessions = [
      s('a', 'Task A', '2026-04-18T09:00:00.000Z', '2026-04-18T10:00:00.000Z'),
      s('b', 'Task B', '2026-04-18T10:30:00.000Z', '2026-04-18T11:30:00.000Z'),
    ];
    const { container } = render(
      <SceneRibbon
        sessions={sessions}
        selectedId={'b'}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    const items = container.querySelectorAll('li');
    expect(items[0].dataset.selected).toBe('false');
    expect(items[1].dataset.selected).toBe('true');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/SceneRibbon.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/shared/SceneRibbon.tsx`:

```tsx
import type { TaskSession } from '../../types';
import { SceneCard } from './SceneCard';

export type SceneRibbonProps = {
  sessions: TaskSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  nowMs: number;
};

export function SceneRibbon({
  sessions,
  selectedId,
  onSelect,
  nowMs,
}: SceneRibbonProps) {
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center text-muted">
        No tasks yet. Start one above, and scenes will appear here.
      </div>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  return (
    <ol className="list-none p-0 m-0 border-t border-line">
      {sorted.map((s, i) => (
        <SceneCard
          key={s.id}
          session={s}
          index={i}
          nowMs={nowMs}
          selected={selectedId === s.id}
          onClick={() => onSelect(s.id)}
        />
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/SceneRibbon.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/SceneRibbon.tsx app/src/test/features/shared/SceneRibbon.test.tsx
git commit -m "feat(shared): SceneRibbon — sorted <ol> of SceneCards with empty state"
```

---

## Task 3.4: `features/shared/Drawer.tsx`

**Files:**
- Create: `app/src/features/shared/Drawer.tsx`
- Create: `app/src/test/features/shared/Drawer.test.tsx`

`Drawer` is the chrome — scrim + slide-in panel. Content is passed as `children`. `SceneDrawer` in Task 3.5 is the content.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/Drawer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '../../../features/shared/Drawer';

describe('Drawer', () => {
  it('does not render content when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <div>panel content</div>
      </Drawer>,
    );
    // Content is still in the DOM but aria-hidden when closed
    const panel = screen.queryByRole('dialog', { hidden: true });
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders content when open', () => {
    render(
      <Drawer open={true} onClose={() => {}}>
        <div>panel content</div>
      </Drawer>,
    );
    expect(screen.getByText('panel content')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false');
  });

  it('fires onClose when scrim is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <div>panel</div>
      </Drawer>,
    );
    await user.click(screen.getByTestId('drawer-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClose when the panel itself is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <div>panel</div>
      </Drawer>,
    );
    await user.click(screen.getByText('panel'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/Drawer.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/shared/Drawer.tsx`:

```tsx
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, onClose, children }: DrawerProps) {
  return createPortal(
    <>
      <div
        data-testid="drawer-scrim"
        className={[
          'fixed inset-0 z-50 transition-opacity duration-300',
          'bg-black/50 backdrop-blur-[2px]',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-hidden={!open}
        className={[
          'fixed top-0 right-0 bottom-0 z-[60] flex flex-col',
          'w-[520px] max-w-[92vw] bg-[#0a0b0e] border-l border-line-2',
          'shadow-[-24px_0_64px_rgba(0,0,0,0.4)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {children}
      </aside>
    </>,
    document.body,
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/Drawer.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/Drawer.tsx app/src/test/features/shared/Drawer.test.tsx
git commit -m "feat(shared): Drawer — slide-in chrome with scrim and portal mount"
```

---

## Task 3.5: `features/shared/SceneDrawer.tsx`

**Files:**
- Create: `app/src/features/shared/SceneDrawer.tsx`
- Create: `app/src/test/features/shared/SceneDrawer.test.tsx`

`SceneDrawer` is the drawer's content: header (kicker + title + focus + close), body (3 mini-stats, attention trace, app breakdown, event log), footer (Rename + Resume/Stop). For active sessions, the stats row is hidden and a placeholder message shows.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/SceneDrawer.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneDrawer } from '../../../features/shared/SceneDrawer';
import { useStore } from '../../../store/useStore';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function completedSession(): TaskSession {
  return {
    id: 's1',
    name: 'Fix timer drift bug',
    startedAt: '2026-04-18T09:50:00.000Z',
    endedAt: '2026-04-18T10:50:00.000Z',
    events: [
      {
        id: 1,
        timestamp: '2026-04-18T09:50:00.000Z',
        duration: 1200,
        data: { app: 'VS Code', title: 'useStore.ts' },
      },
      {
        id: 2,
        timestamp: '2026-04-18T10:10:00.000Z',
        duration: 1800,
        data: { app: 'Terminal', title: 'pnpm test' },
      },
    ],
  };
}

function activeSession(): TaskSession {
  return {
    id: 'active',
    name: 'Write release notes',
    startedAt: '2026-04-18T15:52:00.000Z',
    endedAt: null,
    events: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  // Seed the completed session in the store so renameSession can find it
  useStore.setState({ sessions: [completedSession()] });
});

describe('SceneDrawer — completed session', () => {
  it('renders the task name and "Completed task" kicker', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Fix timer drift bug')).toBeInTheDocument();
    expect(screen.getByText(/Completed task/i)).toBeInTheDocument();
  });

  it('shows 3 mini-stats (Switches / Longest / Top app)', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Switches/)).toBeInTheDocument();
    expect(screen.getByText(/Longest/)).toBeInTheDocument();
    expect(screen.getByText(/Top app/)).toBeInTheDocument();
  });

  it('renders an App breakdown row per app', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    // There should be rows for "VS Code" and "Terminal" in the breakdown
    const vsCodeRows = screen.getAllByText('VS Code');
    const terminalRows = screen.getAllByText('Terminal');
    expect(vsCodeRows.length).toBeGreaterThan(0);
    expect(terminalRows.length).toBeGreaterThan(0);
  });

  it('fires onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renames the session when the Rename input commits on Enter', async () => {
    const user = userEvent.setup();
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText('Rename'));
    const input = screen.getByDisplayValue('Fix timer drift bug');
    await user.clear(input);
    await user.type(input, 'New name{Enter}');
    expect(useStore.getState().sessions[0].name).toBe('New name');
  });

  it('shows a Resume button for completed sessions', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('Resume calls startTask with the session name', async () => {
    const user = userEvent.setup();
    const startSpy = vi.spyOn(useStore.getState(), 'startTask').mockResolvedValue();
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /resume/i }));
    expect(startSpy).toHaveBeenCalledWith('Fix timer drift bug');
  });
});

describe('SceneDrawer — active session', () => {
  it('renders the "In progress" kicker and Stop button', () => {
    render(
      <SceneDrawer
        session={activeSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop task/i })).toBeInTheDocument();
  });

  it('shows the active-session placeholder (no mini-stats, no breakdown)', () => {
    render(
      <SceneDrawer
        session={activeSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText(/in progress.*appear when you stop/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Switches/)).not.toBeInTheDocument();
  });

  it('Stop button calls stopActive', async () => {
    const user = userEvent.setup();
    const stopSpy = vi.spyOn(useStore.getState(), 'stopActive').mockResolvedValue();
    render(
      <SceneDrawer
        session={activeSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /stop task/i }));
    expect(stopSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/SceneDrawer.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SceneDrawer`**

Create `app/src/features/shared/SceneDrawer.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { TaskSession } from '../../types';
import { groupByApp } from '../../lib/aggregation';
import { longestStretch } from '../../lib/timeline';
import { toSegments } from '../../lib/segments';
import {
  focusScore,
  moodClass,
  sessionDurationSec,
} from '../../lib/focus';
import { formatClock, formatDurationShort } from '../../lib/time';
import { appColor } from '../../lib/colors';
import { useStore } from '../../store/useStore';

export type SceneDrawerProps = {
  session: TaskSession;
  nowMs: number;
  onClose: () => void;
};

export function SceneDrawer({ session, nowMs, onClose }: SceneDrawerProps) {
  const isActive = !session.endedAt;
  const startIso = session.startedAt;
  const endIso = session.endedAt ?? new Date(nowMs).toISOString();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const durSec = sessionDurationSec(session, nowMs);

  const slices = useMemo(
    () => groupByApp(session.events, startIso, endIso),
    [session.events, startIso, endIso],
  );
  const segments = useMemo(() => toSegments(session.events), [session.events]);
  const switches = Math.max(0, segments.length - 1);
  const longest = longestStretch(session.events);
  const score = focusScore(session, nowMs) ?? 0;
  const mood = moodClass(score);

  const moodColor =
    mood === 'deep' ? 'text-good' : mood === 'mixed' ? 'text-warn' : 'text-bad';

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(session.name);
  const renameSession = useStore((s) => s.renameSession);
  const startTask = useStore((s) => s.startTask);
  const stopActive = useStore((s) => s.stopActive);

  function commitRename() {
    if (nameDraft.trim() && nameDraft.trim() !== session.name) {
      renameSession(session.id, nameDraft);
    }
    setRenaming(false);
  }

  return (
    <>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-start px-6 pt-6 pb-4 border-b border-line">
        <div className="min-w-0">
          <div
            className={[
              'font-mono text-[10px] tracking-[0.14em] uppercase inline-flex items-center gap-2',
              isActive ? 'text-good' : 'text-muted',
            ].join(' ')}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
            )}
            {isActive ? 'In progress' : 'Completed task'}
          </div>
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setNameDraft(session.name);
                  setRenaming(false);
                }
              }}
              className="mt-1 w-full bg-bg-1 border border-line-2 rounded px-2 py-1 text-xl font-semibold text-ink outline-none focus:border-accent"
            />
          ) : (
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {session.name}
            </h2>
          )}
          <div className="mt-1 text-xs text-muted font-mono">
            {formatClock(session.startedAt)} –{' '}
            {session.endedAt ? formatClock(session.endedAt) : 'now'}
            {' · '}
            {formatDurationShort(durSec)}
          </div>
        </div>
        <div className="text-center bg-bg-1 border border-line rounded px-3 py-1.5 shrink-0">
          <div className={`font-mono text-xl font-semibold leading-none ${moodColor}`}>
            {Math.round(score * 100)}
          </div>
          <div className="text-[9px] tracking-[0.14em] uppercase text-muted mt-0.5">
            focus
          </div>
        </div>
        <button
          aria-label="Close drawer"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-bg-1 border border-line text-muted hover:text-ink hover:border-line-2 text-lg leading-none inline-flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
        {isActive ? (
          <div className="text-sm text-muted bg-bg-1 border border-line rounded-lg px-4 py-6 text-center">
            This task is in progress. App breakdown and event log will appear
            when you stop.
          </div>
        ) : (
          <>
            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Switches
                </div>
                <div className="font-mono text-base text-ink">{switches}</div>
                <div className="text-[11px] text-muted mt-0.5 font-mono">
                  {switches === 0 ? 'one stretch' : `${segments.length} segments`}
                </div>
              </div>
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Longest
                </div>
                <div className="font-mono text-base">
                  {longest ? formatDurationShort(longest.seconds) : '—'}
                </div>
                <div
                  className="text-[11px] mt-0.5 font-mono"
                  style={{ color: longest ? appColor(longest.app) : undefined }}
                >
                  {longest?.app ?? ''}
                </div>
              </div>
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Top app
                </div>
                <div
                  className="font-mono text-base"
                  style={{
                    color: slices[0] ? appColor(slices[0].app) : undefined,
                  }}
                >
                  {slices[0] ? `${slices[0].percent.toFixed(0)}%` : '—'}
                </div>
                <div className="text-[11px] text-muted mt-0.5 font-mono">
                  {slices[0]?.app ?? ''}
                </div>
              </div>
            </div>

            {/* Attention trace */}
            <div>
              <SectionLabel
                title="Attention trace"
                hint={`${formatClock(session.startedAt)} – ${formatClock(session.endedAt!)}`}
              />
              <div className="relative h-8 rounded bg-bg-1 border border-line overflow-hidden">
                {segments.map((seg, i) => {
                  const total = end - start;
                  const l = ((seg.start - start) / total) * 100;
                  const w = ((seg.end - seg.start) / total) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${l}%`,
                        width: `${w}%`,
                        background: appColor(seg.app),
                      }}
                      title={`${seg.app}${seg.title ? ` · ${seg.title}` : ''} · ${formatDurationShort((seg.end - seg.start) / 1000)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5 font-mono text-[10px] text-muted-2">
                <span>{formatClock(session.startedAt)}</span>
                <span>{formatClock(session.endedAt!)}</span>
              </div>
            </div>

            {/* App breakdown */}
            <div>
              <SectionLabel
                title="App breakdown"
                hint={`${slices.length} apps`}
              />
              <ul className="list-none p-0 m-0 flex flex-col gap-1">
                {slices.map((s) => (
                  <li
                    key={s.app}
                    className="grid grid-cols-[8px_100px_1fr_40px_60px] gap-2.5 items-center py-1 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: appColor(s.app) }}
                    />
                    <span className="text-ink-2 truncate">{s.app}</span>
                    <div className="h-1 bg-bg-1 rounded-sm overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${s.percent}%`,
                          background: appColor(s.app),
                        }}
                      />
                    </div>
                    <span className="text-right font-mono text-[11px] text-muted">
                      {s.percent.toFixed(0)}%
                    </span>
                    <span className="text-right font-mono text-[11px] text-ink-2">
                      {formatDurationShort(s.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Event log */}
            <div>
              <SectionLabel
                title="Event log"
                hint={`${session.events.length} events`}
              />
              <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                {session.events.map((e) => (
                  <li
                    key={e.id}
                    className="grid grid-cols-[44px_10px_90px_1fr_56px] gap-2 items-center py-1 px-1.5 rounded hover:bg-bg-1 text-[11px]"
                  >
                    <span className="text-muted font-mono">
                      {formatClock(e.timestamp)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: appColor(e.data.app) }}
                    />
                    <span className="text-ink-2 font-mono truncate">
                      {e.data.app}
                    </span>
                    <span className="text-ink truncate">{e.data.title}</span>
                    <span className="text-right text-muted font-mono">
                      {formatDurationShort(e.duration)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-6 py-3.5 border-t border-line bg-[#0a0b0e]">
        <button
          onClick={() => {
            setNameDraft(session.name);
            setRenaming(true);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 border border-line-2 bg-bg-1 hover:text-ink hover:border-muted-2"
        >
          Rename
        </button>
        {isActive ? (
          <button
            onClick={() => stopActive()}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 bg-bg-2 border border-line-2 hover:bg-bad hover:text-[#2a0808] hover:border-bad"
          >
            Stop task
          </button>
        ) : (
          <button
            onClick={() => startTask(session.name)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-[#0b0c10] border border-transparent hover:bg-accent-2"
          >
            Resume
          </button>
        )}
      </div>
    </>
  );
}

function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[10px] tracking-[0.14em] uppercase text-muted">
        {title}
      </span>
      <span className="font-mono text-[10px] text-muted-2">{hint}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/SceneDrawer.test.tsx
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/SceneDrawer.tsx app/src/test/features/shared/SceneDrawer.test.tsx
git commit -m "feat(shared): SceneDrawer — header, stats, trace, breakdown, event log, Rename/Resume/Stop"
```

---

## Task 3.6: `features/shared/CommandBar.tsx`

**Files:**
- Create: `app/src/features/shared/CommandBar.tsx`
- Create: `app/src/test/features/shared/CommandBar.test.tsx`

`CommandBar` is a portal-mounted ⌘K overlay. Items come from two sources: the store (tasks) and a static list (view jumps + actions). Arrow keys navigate; Enter fires; Esc closes.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/CommandBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandBar } from '../../../features/shared/CommandBar';
import { useStore } from '../../../store/useStore';

function renderCmd(props: Partial<Parameters<typeof CommandBar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CommandBar
        open={true}
        onClose={() => {}}
        onPickTask={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('CommandBar', () => {
  it('shows view-jump items always', () => {
    renderCmd();
    expect(screen.getByText('Open Today')).toBeInTheDocument();
    expect(screen.getByText('Open Week')).toBeInTheDocument();
    expect(screen.getByText('Open Aggregate')).toBeInTheDocument();
    expect(screen.getByText('Open Web')).toBeInTheDocument();
  });

  it('shows task items from the store', async () => {
    await useStore.getState().startTask('First task');
    await useStore.getState().startTask('Second task');
    renderCmd();
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
  });

  it('filters items as the user types', async () => {
    const user = userEvent.setup();
    await useStore.getState().startTask('Fix timer drift');
    renderCmd();
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'timer');
    expect(screen.getByText('Fix timer drift')).toBeInTheDocument();
    expect(screen.queryByText('Open Today')).not.toBeInTheDocument();
  });

  it('fires onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderCmd({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('fires onPickTask when Enter is pressed on a task item', async () => {
    const user = userEvent.setup();
    await useStore.getState().startTask('Morning review');
    const id = useStore.getState().sessions[0].id;
    const onPickTask = vi.fn();
    renderCmd({ onPickTask });
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'morning');
    await user.keyboard('{Enter}');
    expect(onPickTask).toHaveBeenCalledWith(id);
  });

  it('renders no-matches hint when no item matches', async () => {
    const user = userEvent.setup();
    renderCmd();
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'zzzzz');
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
  });

  it('returns null when open is false', () => {
    const { container } = render(
      <MemoryRouter>
        <CommandBar open={false} onClose={() => {}} onPickTask={() => {}} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/CommandBar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/shared/CommandBar.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { formatClock } from '../../lib/time';
import { Kbd } from './KeyHint';

type Item = {
  kind: 'View' | 'Task' | 'Active';
  label: string;
  hint?: string;
  action: () => void;
};

export type CommandBarProps = {
  open: boolean;
  onClose: () => void;
  onPickTask: (sessionId: string) => void;
};

export function CommandBar({ open, onClose, onPickTask }: CommandBarProps) {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);

  const items = useMemo<Item[]>(() => {
    const viewItems: Item[] = [
      { kind: 'View', label: 'Open Today',     action: () => { navigate('/today');     onClose(); } },
      { kind: 'View', label: 'Open Week',      action: () => { navigate('/week');      onClose(); } },
      { kind: 'View', label: 'Open Aggregate', action: () => { navigate('/aggregate'); onClose(); } },
      { kind: 'View', label: 'Open Web',       action: () => { navigate('/web');       onClose(); } },
    ];
    const taskItems: Item[] = sessions.map((s) => ({
      kind: s.endedAt ? 'Task' : 'Active',
      label: s.name,
      hint: formatClock(s.startedAt),
      action: () => onPickTask(s.id),
    }));
    return [...viewItems, ...taskItems];
  }, [sessions, navigate, onClose, onPickTask]);

  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => setSel(0), [query]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[sel];
      if (it) it.action();
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-lg flex items-start justify-center pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="w-[560px] bg-bg-2 border border-line-2 rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Type a command or task name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full px-4 py-4 bg-transparent border-0 outline-0 text-base border-b border-line text-ink placeholder:text-muted"
        />
        <ul className="list-none m-0 p-1.5 max-h-[360px] overflow-y-auto">
          {filtered.map((i, idx) => (
            <li
              key={`${i.kind}:${i.label}:${idx}`}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded text-[13px] cursor-pointer',
                idx === sel ? 'bg-bg-3' : 'hover:bg-bg-3',
              ].join(' ')}
              onMouseEnter={() => setSel(idx)}
              onClick={() => i.action()}
            >
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-mono w-[60px] shrink-0">
                {i.kind}
              </span>
              <span className="text-ink">{i.label}</span>
              {i.hint && (
                <span className="ml-auto text-muted text-[11px] font-mono">
                  {i.hint}
                </span>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-muted text-[13px]">No matches</li>
          )}
        </ul>
        <div className="flex gap-4 px-3.5 py-2 border-t border-line text-[11px] text-muted bg-bg-1">
          <span>
            <Kbd>↑↓</Kbd> navigate
          </span>
          <span>
            <Kbd>⏎</Kbd> select
          </span>
          <span>
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/CommandBar.test.tsx
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/CommandBar.tsx app/src/test/features/shared/CommandBar.test.tsx
git commit -m "feat(shared): CommandBar — ⌘K overlay with task + view-jump items"
```

---

## Phase 3 exit checklist

- [ ] All test files under `src/test/features/shared/` pass: `npm run test:run -- src/test/features/shared/`.
- [ ] `npm run build` passes.
- [ ] Commit log contains 6 commits (one per task).

Phase 4 (Today tab) picks up here.
