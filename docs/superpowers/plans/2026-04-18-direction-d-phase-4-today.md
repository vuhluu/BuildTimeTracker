# Direction D Rebuild — Phase 4: Today tab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Today tab: active-card (idle ↔ running), film strip, category filter, day stats, scene ribbon + drawer wiring, ⌘K command bar, keyboard shortcuts. After this phase, the app's primary daily workflow is complete.

**Architecture:** `TodayPage` orchestrates — owns `selectedId`, `catFilter`, `cmdOpen` as local state; reads sessions from the store. The active session is whichever session has `endedAt == null`. All four sub-components under `features/today/` are stateless (take props, fire callbacks).

**Tech Stack:** React 18, react-router-dom, Tailwind, Vitest + @testing-library/react.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

**Preconditions:** Phases 1–3 merged. The `features/shared/*` primitives and `lib/*` helpers are all live.

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

---

## Task 4.1: `features/today/ActiveCard.tsx`

**Files:**
- Create: `app/src/features/today/ActiveCard.tsx`
- Create: `app/src/test/features/today/ActiveCard.test.tsx`

Two render branches: idle (text input + Start button + Recent chips) and running (timer, task name, Stop + Inspect buttons).

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/today/ActiveCard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveCard } from '../../../features/today/ActiveCard';
import { useStore } from '../../../store/useStore';
import type { TaskSession } from '../../../types';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

function activeSession(): TaskSession {
  return {
    id: 'active',
    name: 'Write release notes',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    endedAt: null,
    events: [],
  };
}

describe('ActiveCard — idle state', () => {
  it('renders the input and start button when no active session', () => {
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    expect(
      screen.getByPlaceholderText(/what are you working on/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start task/i })).toBeInTheDocument();
  });

  it('renders up to five Recent chips', () => {
    render(
      <ActiveCard
        activeSession={null}
        onInspect={() => {}}
        recents={['A', 'B', 'C', 'D', 'E', 'F']}
      />,
    );
    // Exactly 5 buttons (chips) plus 1 Start button = 6 total
    const allButtons = screen.getAllByRole('button');
    // Start task + 5 chips
    expect(allButtons.length).toBe(6);
  });

  it('calls startTask on Enter in the input', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    const input = screen.getByPlaceholderText(/what are you working on/i);
    await user.type(input, 'New thing{Enter}');
    expect(spy).toHaveBeenCalledWith('New thing');
  });

  it('calls startTask when a Recent chip is clicked', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(
      <ActiveCard
        activeSession={null}
        onInspect={() => {}}
        recents={['Morning review', 'Fix bug']}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Morning review' }));
    expect(spy).toHaveBeenCalledWith('Morning review');
  });

  it('clears the input after Enter', async () => {
    const user = userEvent.setup();
    useStore.setState({ startTask: vi.fn().mockResolvedValue(undefined) });
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    const input = screen.getByPlaceholderText(/what are you working on/i) as HTMLInputElement;
    await user.type(input, 'Task{Enter}');
    expect(input.value).toBe('');
  });

  it('ignores empty or whitespace-only Enter', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    const input = screen.getByPlaceholderText(/what are you working on/i);
    await user.type(input, '   {Enter}');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('ActiveCard — running state', () => {
  it('renders task name, Stop, and Inspect buttons', () => {
    render(
      <ActiveCard
        activeSession={activeSession()}
        onInspect={() => {}}
        recents={[]}
      />,
    );
    expect(screen.getByText('Write release notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inspect/i })).toBeInTheDocument();
  });

  it('Stop calls stopActive', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ stopActive: spy });
    render(
      <ActiveCard
        activeSession={activeSession()}
        onInspect={() => {}}
        recents={[]}
      />,
    );
    await user.click(screen.getByRole('button', { name: /stop/i }));
    expect(spy).toHaveBeenCalled();
  });

  it('Inspect fires onInspect with session.id', async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();
    render(
      <ActiveCard activeSession={activeSession()} onInspect={onInspect} recents={[]} />,
    );
    await user.click(screen.getByRole('button', { name: /inspect/i }));
    expect(onInspect).toHaveBeenCalledWith('active');
  });

  it('shows a running timer', () => {
    render(
      <ActiveCard activeSession={activeSession()} onInspect={() => {}} recents={[]} />,
    );
    // The display-timer is rendered in a monospace format matching 0:00 or 00:00 or 0:00:00.
    // Assert the element exists and contains at least a colon.
    const timer = screen.getByTestId('active-timer');
    expect(timer.textContent).toMatch(/\d+:\d{2}/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/today/ActiveCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/today/ActiveCard.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { TaskSession } from '../../types';
import { useStore } from '../../store/useStore';
import { formatDuration, formatClock } from '../../lib/time';

export type ActiveCardProps = {
  activeSession: TaskSession | null;
  onInspect: (id: string) => void;
  recents: string[];
};

export function ActiveCard({ activeSession, onInspect, recents }: ActiveCardProps) {
  if (activeSession) {
    return <RunningCard session={activeSession} onInspect={onInspect} />;
  }
  return <IdleCard recents={recents.slice(0, 5)} />;
}

function IdleCard({ recents }: { recents: string[] }) {
  const [name, setName] = useState('');
  const startTask = useStore((s) => s.startTask);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await startTask(trimmed);
    setName('');
    inputRef.current?.focus();
  }

  return (
    <section className="rounded-lg border border-line-2 bg-bg-2 p-6">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-2" />
        Not tracking
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="What are you working on?"
          className="flex-1 bg-bg-1 border border-line rounded-lg px-4 py-2.5 text-base text-ink outline-none focus:border-accent placeholder:text-muted"
          autoFocus
        />
        <button
          onClick={submit}
          className="px-4 py-2.5 rounded-lg bg-accent text-[#0b0c10] font-medium hover:bg-accent-2"
          aria-label="Start task"
        >
          Start task
        </button>
      </div>
      {recents.length > 0 && (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-xs text-muted">Recent:</span>
          {recents.map((name) => (
            <button
              key={name}
              onClick={() => startTask(name)}
              className="text-xs px-2.5 py-1 rounded-full bg-bg-1 border border-line text-ink-2 hover:border-line-2"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RunningCard({
  session,
  onInspect,
}: {
  session: TaskSession;
  onInspect: (id: string) => void;
}) {
  const stopActive = useStore((s) => s.stopActive);
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(
    0,
    (Date.now() - new Date(session.startedAt).getTime()) / 1000,
  );

  return (
    <section className="relative rounded-lg border border-line-2 overflow-hidden bg-gradient-to-b from-bg-2 to-bg-1 p-7">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-transparent animate-pulse"
        aria-hidden
      />
      <div className="grid grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="text-[11px] tracking-[0.14em] uppercase text-accent mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgba(251,191,36,0.15)]" />
            In progress
          </div>
          <div className="text-3xl font-semibold tracking-tight">
            {session.name}
          </div>
          <div className="text-muted text-sm mt-1.5">
            Started <strong className="text-ink-2">{formatClock(session.startedAt)}</strong>
          </div>
        </div>
        <div className="text-right">
          <div
            data-testid="active-timer"
            className="font-mono text-5xl font-medium tabular-nums tracking-tight"
          >
            {formatDuration(elapsedSec)}
          </div>
          <div className="flex gap-2 justify-end mt-3.5">
            <button
              onClick={() => onInspect(session.id)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
              aria-label="Inspect this task"
            >
              Inspect this task →
            </button>
            <button
              onClick={() => stopActive()}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium bg-bad text-[#2a0808] hover:bg-[#fc8c8c]"
              aria-label="Stop"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/today/ActiveCard.test.tsx
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/today/ActiveCard.tsx app/src/test/features/today/ActiveCard.test.tsx
git commit -m "feat(today): ActiveCard — idle input/recents ↔ running timer with Stop/Inspect"
```

---

## Task 4.2: `features/today/FilmStrip.tsx`

**Files:**
- Create: `app/src/features/today/FilmStrip.tsx`
- Create: `app/src/test/features/today/FilmStrip.test.tsx`

A tiny day-wide bar showing all of today's sessions compressed horizontally. Click a segment → select that session.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/today/FilmStrip.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilmStrip } from '../../../features/today/FilmStrip';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeSessions(): TaskSession[] {
  return [
    {
      id: 's1',
      name: 'Morning review',
      startedAt: '2026-04-18T09:12:00.000Z',
      endedAt: '2026-04-18T09:47:00.000Z',
      events: [
        {
          id: 1,
          timestamp: '2026-04-18T09:12:00.000Z',
          duration: 35 * 60,
          data: { app: 'Linear', title: 'Inbox' },
        },
      ],
    },
    {
      id: 's2',
      name: 'Fix bug',
      startedAt: '2026-04-18T10:00:00.000Z',
      endedAt: '2026-04-18T11:00:00.000Z',
      events: [
        {
          id: 2,
          timestamp: '2026-04-18T10:00:00.000Z',
          duration: 3600,
          data: { app: 'VS Code', title: 'file.ts' },
        },
      ],
    },
  ];
}

describe('FilmStrip', () => {
  it('renders a labelled day range', () => {
    render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={() => {}} />,
    );
    expect(screen.getByText(/DAY AT A GLANCE/i)).toBeInTheDocument();
  });

  it('renders a segment per event', () => {
    const { container } = render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={() => {}} />,
    );
    const segs = container.querySelectorAll('[data-filmstrip-seg]');
    expect(segs.length).toBe(2);
  });

  it('fires onSelect with session id when a segment is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={onSelect} />,
    );
    const segs = container.querySelectorAll('[data-filmstrip-seg]');
    await user.click(segs[0] as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith('s1');
  });

  it('renders an empty strip when no sessions', () => {
    render(<FilmStrip sessions={[]} nowMs={NOW} onSelect={() => {}} />);
    expect(screen.getByText(/nothing tracked yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/today/FilmStrip.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/today/FilmStrip.tsx`:

```tsx
import type { TaskSession } from '../../types';
import { toSegments } from '../../lib/segments';
import { appColor } from '../../lib/colors';

export type FilmStripProps = {
  sessions: TaskSession[];
  nowMs: number;
  onSelect: (id: string) => void;
};

// Display range: 6am → 11pm local, compressed into a single bar.
const HOUR_START = 6;
const HOUR_END = 23;
const RANGE_MS = (HOUR_END - HOUR_START) * 3600 * 1000;

function startOfDayMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(HOUR_START, 0, 0, 0);
  return d.getTime();
}

export function FilmStrip({ sessions, nowMs, onSelect }: FilmStripProps) {
  const dayFrom = startOfDayMs(nowMs);
  return (
    <div className="mb-6">
      <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-2 flex items-center justify-between">
        <span>Day at a glance</span>
        <span className="font-mono text-[10px] text-muted-2">
          {HOUR_START}a – {HOUR_END > 12 ? `${HOUR_END - 12}p` : `${HOUR_END}a`}
        </span>
      </div>
      <div className="relative h-6 rounded bg-bg-1 border border-line overflow-hidden">
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">
            Nothing tracked yet
          </div>
        )}
        {sessions.flatMap((s) =>
          toSegments(s.events).map((seg, i) => {
            const l = Math.max(0, ((seg.start - dayFrom) / RANGE_MS) * 100);
            const w = Math.min(100 - l, ((seg.end - seg.start) / RANGE_MS) * 100);
            if (w <= 0 || l >= 100) return null;
            return (
              <button
                key={`${s.id}:${i}`}
                data-filmstrip-seg
                onClick={() => onSelect(s.id)}
                title={`${s.name} · ${seg.app}`}
                className="absolute top-0 bottom-0 hover:brightness-125 transition-[filter]"
                style={{
                  left: `${l}%`,
                  width: `${Math.max(0.3, w)}%`,
                  background: appColor(seg.app),
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/today/FilmStrip.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/today/FilmStrip.tsx app/src/test/features/today/FilmStrip.test.tsx
git commit -m "feat(today): FilmStrip — compressed day-wide segment bar"
```

---

## Task 4.3: `features/today/CategoryFilter.tsx`

**Files:**
- Create: `app/src/features/today/CategoryFilter.tsx`
- Create: `app/src/test/features/today/CategoryFilter.test.tsx`

Row of chips: **All / Code / Creative / Comm / Meeting / Browse**. Only renders chips whose total across today's sessions is > 0 (except All).

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/today/CategoryFilter.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from '../../../features/today/CategoryFilter';

describe('CategoryFilter', () => {
  it('renders All plus chips for present categories', () => {
    render(
      <CategoryFilter
        totals={new Map([
          ['code', 3600],
          ['comm', 1200],
        ])}
        value="all"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comm/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /creative/i }),
    ).not.toBeInTheDocument();
  });

  it('marks the active chip with aria-pressed', () => {
    render(
      <CategoryFilter
        totals={new Map([['code', 100]])}
        value="code"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: /code/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'All' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryFilter
        totals={new Map([['meeting', 100]])}
        value="all"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /meeting/i }));
    expect(onChange).toHaveBeenCalledWith('meeting');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/today/CategoryFilter.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/today/CategoryFilter.tsx`:

```tsx
import type { Category } from '../../types';

export type FilterValue = 'all' | Category;

const ORDER: Category[] = ['code', 'creative', 'comm', 'meeting', 'browse'];

const CATEGORY_COLOR: Record<Category, string> = {
  code: '#7AA2F7',
  creative: '#E879F9',
  comm: '#F59E0B',
  meeting: '#38BDF8',
  browse: '#94A3B8',
};

export type CategoryFilterProps = {
  totals: Map<Category, number>;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
};

export function CategoryFilter({ totals, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-0.5">
      <button
        className={chipClass(value === 'all')}
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {ORDER.map((c) => {
        if ((totals.get(c) ?? 0) <= 0) return null;
        const active = value === c;
        return (
          <button
            key={c}
            className={chipClass(active)}
            aria-pressed={active}
            onClick={() => onChange(c)}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: CATEGORY_COLOR[c] }}
              aria-hidden
            />
            <span className="capitalize">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

function chipClass(active: boolean): string {
  return [
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs',
    active
      ? 'bg-bg-3 text-ink'
      : 'text-muted hover:bg-bg-2 hover:text-ink-2',
  ].join(' ');
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/today/CategoryFilter.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/today/CategoryFilter.tsx app/src/test/features/today/CategoryFilter.test.tsx
git commit -m "feat(today): CategoryFilter — chip row with aria-pressed state"
```

---

## Task 4.4: `features/today/TodayPage.tsx` — full wiring

**Files:**
- Modify: `app/src/features/today/TodayPage.tsx` (replace Phase 2 placeholder)
- Create: `app/src/test/features/today/TodayPage.test.tsx`

Compose everything: header, stats, toolbar (cmd trigger + CategoryFilter), FilmStrip, ActiveCard, SceneRibbon, Drawer + SceneDrawer, CommandBar, KeyHint. Owns `selectedId`, `catFilter`, `cmdOpen` local state. Registers global keyboard handlers.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/today/TodayPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TodayPage } from '../../../features/today/TodayPage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/today']}>
      <TodayPage />
    </MemoryRouter>,
  );
}

describe('TodayPage', () => {
  it('renders the day header', () => {
    renderPage();
    expect(screen.getByText(/Your day, so far/i)).toBeInTheDocument();
  });

  it('renders the ActiveCard idle input when no active session', () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/what are you working on/i),
    ).toBeInTheDocument();
  });

  it('shows an active ActiveCard when a session is running', async () => {
    await useStore.getState().startTask('Deep work');
    renderPage();
    expect(screen.getByText('Deep work')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('opens the command bar on Cmd/Ctrl+K', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
  });

  it('closes the command bar on Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
  });

  it('does not hijack j/k when an input is focused', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(/what are you working on/i);
    input.focus();
    // Typing j into the input should land inside the input, not move selection.
    await user.keyboard('j');
    expect((input as HTMLInputElement).value).toBe('j');
  });
});
```

- [ ] **Step 2: Run to verify it fails (because the Phase 2 placeholder doesn't have this behaviour)**

```bash
npm run test:run -- src/test/features/today/TodayPage.test.tsx
```

Expected: FAIL on multiple assertions (placeholder currently shows "Today — placeholder").

- [ ] **Step 3: Replace `features/today/TodayPage.tsx`**

Write:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { ActiveCard } from './ActiveCard';
import { FilmStrip } from './FilmStrip';
import { CategoryFilter, type FilterValue } from './CategoryFilter';
import { SceneRibbon } from '../shared/SceneRibbon';
import { Drawer } from '../shared/Drawer';
import { SceneDrawer } from '../shared/SceneDrawer';
import { CommandBar } from '../shared/CommandBar';
import { KeyHint, Kbd } from '../shared/KeyHint';
import { formatDurationShort } from '../../lib/time';
import { dayFocusScore } from '../../lib/focus';
import { appCategory } from '../../lib/categories';
import { contextSwitches } from '../../lib/timeline';
import { sameLocalDay } from '../../lib/time';
import type { Category, TaskSession } from '../../types';

export function TodayPage() {
  const allSessions = useStore((s) => s.sessions);
  const categoryOverrides = useStore((s) => s.categoryOverrides);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const todaySessions = useMemo(
    () => allSessions.filter((s) => sameLocalDay(s.startedAt, new Date(nowMs))),
    [allSessions, nowMs],
  );

  const active = todaySessions.find((s) => !s.endedAt) ?? null;
  const completedSortedDesc = useMemo(
    () =>
      allSessions
        .filter((s) => s.endedAt)
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        ),
    [allSessions],
  );
  const recentNames = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const s of completedSortedDesc) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      list.push(s.name);
      if (list.length >= 5) break;
    }
    return list;
  }, [completedSortedDesc]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<FilterValue>('all');
  const [cmdOpen, setCmdOpen] = useState(false);

  // Category totals for the filter row
  const catTotals = useMemo(() => {
    const map = new Map<Category, number>();
    for (const s of todaySessions) {
      for (const e of s.events) {
        const cat = appCategory(e.data.app, categoryOverrides);
        map.set(cat, (map.get(cat) ?? 0) + e.duration);
      }
    }
    return map;
  }, [todaySessions, categoryOverrides]);

  const filteredSessions: TaskSession[] = useMemo(() => {
    if (catFilter === 'all') return todaySessions;
    return todaySessions.filter((s) =>
      s.events.some(
        (e) => appCategory(e.data.app, categoryOverrides) === catFilter,
      ),
    );
  }, [todaySessions, catFilter, categoryOverrides]);

  // Day stats
  const totalSec = useMemo(
    () =>
      todaySessions.reduce((a, s) => {
        const start = new Date(s.startedAt).getTime();
        const end = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
        return a + Math.max(0, (end - start) / 1000);
      }, 0),
    [todaySessions, nowMs],
  );
  const focus = dayFocusScore(todaySessions, nowMs);
  const switches = todaySessions.reduce(
    (a, s) => a + contextSwitches(s.events),
    0,
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? '';
      const inInput = /^(INPUT|TEXTAREA)$/.test(tag);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === 'Escape') {
        if (cmdOpen) setCmdOpen(false);
        else if (selectedId) setSelectedId(null);
      } else if (!inInput && (e.key === 'j' || e.key === 'k')) {
        const order = [...filteredSessions]
          .sort(
            (a, b) =>
              new Date(a.startedAt).getTime() -
              new Date(b.startedAt).getTime(),
          )
          .map((s) => s.id);
        if (order.length === 0) return;
        const i = order.indexOf(selectedId ?? '');
        const next =
          e.key === 'j'
            ? i < 0
              ? 0
              : Math.min(order.length - 1, i + 1)
            : i < 0
              ? order.length - 1
              : Math.max(0, i - 1);
        setSelectedId(order[next]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cmdOpen, selectedId, filteredSessions]);

  const selectedSession =
    todaySessions.find((s) => s.id === selectedId) ??
    allSessions.find((s) => s.id === selectedId) ??
    null;
  const drawerOpen = !!selectedSession;

  return (
    <>
      <main
        className={[
          'max-w-[980px] mx-auto px-6 py-10 transition-[transform,filter] duration-300',
          drawerOpen
            ? '-translate-x-[60px] brightness-[.6] saturate-[.8] pointer-events-none'
            : '',
        ].join(' ')}
        aria-hidden={drawerOpen}
      >
        <header className="mb-6">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            {new Date(nowMs).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            Your day, so far.
          </h1>
          <div className="grid grid-cols-3 gap-8 mt-6">
            <Stat label="tracked" value={formatDurationShort(totalSec)} />
            <Stat
              label="focus"
              value={`${Math.round(focus * 100)}`}
              suffix="/100"
            />
            <Stat label="switches" value={String(switches)} />
          </div>
        </header>

        <div className="flex items-center gap-3 mb-6 p-3.5 bg-bg-1 border border-line rounded-lg">
          <button
            className="flex-1 inline-flex items-center gap-3.5 text-muted text-sm hover:text-ink-2"
            onClick={() => setCmdOpen(true)}
          >
            <span className="text-muted-2">⌕</span>
            <span>Search tasks, apps · jump anywhere</span>
            <span className="ml-auto">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <div className="w-px h-5 bg-line" />
          <CategoryFilter
            totals={catTotals}
            value={catFilter}
            onChange={setCatFilter}
          />
        </div>

        <FilmStrip
          sessions={todaySessions}
          nowMs={nowMs}
          onSelect={setSelectedId}
        />

        <div className="mb-10">
          <ActiveCard
            activeSession={active}
            onInspect={setSelectedId}
            recents={recentNames}
          />
        </div>

        <div className="mb-3">
          <h2 className="font-serif text-2xl mt-10">Today, scene by scene</h2>
          <p className="text-sm text-muted mt-1">
            Click any scene for the full breakdown. <Kbd>j</Kbd>/<Kbd>k</Kbd> to navigate ·{' '}
            <Kbd>⌘K</Kbd> to jump.
          </p>
        </div>
        <SceneRibbon
          sessions={filteredSessions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          nowMs={nowMs}
        />
      </main>

      <Drawer open={drawerOpen} onClose={() => setSelectedId(null)}>
        {selectedSession && (
          <SceneDrawer
            session={selectedSession}
            nowMs={nowMs}
            onClose={() => setSelectedId(null)}
          />
        )}
      </Drawer>

      <CommandBar
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onPickTask={(id) => {
          setSelectedId(id);
          setCmdOpen(false);
        }}
      />

      {!drawerOpen && !cmdOpen && (
        <KeyHint>
          <Kbd>⌘K</Kbd> search · click a scene for detail
        </KeyHint>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-3xl font-medium tabular-nums text-ink">
        {value}
        {suffix && (
          <span className="text-muted text-lg ml-1">{suffix}</span>
        )}
      </span>
      <span className="text-[11px] tracking-[0.14em] uppercase text-muted mt-1">
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/today/TodayPage.test.tsx
```

Expected: PASS — 6 tests.

Also run:

```bash
npm run test:run -- src/test/features/
```

Expected: all feature tests pass.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:5173/today`:
- Page loads with the day header.
- If no active task, the ActiveCard shows an input; typing "Deep work" and pressing Enter starts a task.
- The ActiveCard flips to the running state with a live ticking timer.
- Click Stop — returns to idle, session appears in the ribbon.
- Click a scene card → drawer slides in from the right, canvas dims.
- Press `Esc` → drawer closes.
- Press `⌘K` → command bar opens. Type "week" → see "Open Week" filter down. Press Enter → navigates to `/week`.
- Press `j`/`k` → drawer selection moves up/down.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/today/TodayPage.tsx app/src/test/features/today/TodayPage.test.tsx
git commit -m "feat(today): TodayPage wiring — header, stats, toolbar, filmstrip, active card, ribbon, drawer, cmd bar, keyboard"
```

---

## Phase 4 exit checklist

- [ ] `npm run test:run -- src/test/features/today/` and `src/test/features/shared/` all pass.
- [ ] `npm run build` passes.
- [ ] Manual smoke test above passes end-to-end.
- [ ] Commit log contains 4 commits.

Phase 5 (Week tab) picks up here.
