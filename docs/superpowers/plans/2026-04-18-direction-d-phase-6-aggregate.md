# Direction D Rebuild — Phase 6: Aggregate tab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Aggregate tab to match Direction D — KPI cards on top, re-styled date-range + task-filter controls, stacked bars, and the existing CSV table below. Feature set is unchanged from the current app; visual treatment is new. Comparison-mode is explicitly deferred.

**Architecture:** `AggregatePage` replaces the Phase 2 placeholder. It reuses the existing pure logic (`lib/aggregate-range.ts`, `lib/csv.ts`). `AggregateTable` is a re-skinned port of the current `AggregatedTable` — same API, new styles.

**Tech Stack:** React 18, Tailwind (theme from Phase 1), Vitest + @testing-library/react. No new deps.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

**Preconditions:** Phases 1–5 merged.

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

---

## Task 6.1: `features/aggregate/AggregateTable.tsx` — re-skinned port

**Files:**
- Create: `app/src/features/aggregate/AggregateTable.tsx`
- Create: `app/src/test/features/aggregate/AggregateTable.test.tsx`

Direct port of current `src/components/AggregatedTable.tsx` — same logic, re-styled to Direction D tokens. CSV export behaviour identical.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/aggregate/AggregateTable.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AggregateTable } from '../../../features/aggregate/AggregateTable';
import type { AggregatedRow } from '../../../lib/aggregate-range';

beforeEach(() => {
  // jsdom lacks URL.createObjectURL — assign directly (per CLAUDE.md).
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () =>
    'blob:stub';
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
});

const rows: AggregatedRow[] = [
  {
    name: 'Fix bug',
    totalSec: 3600,
    sessionCount: 2,
    avgSec: 1800,
    breakdown: [
      { app: 'VS Code', seconds: 2400, percent: 66.7 },
      { app: 'Chrome', seconds: 1200, percent: 33.3 },
    ],
  },
];

describe('AggregateTable', () => {
  it('renders a row per entry with task name + total', () => {
    render(<AggregateTable rows={rows} />);
    expect(screen.getByText('Fix bug')).toBeInTheDocument();
    // Total comes through formatDuration as "1:00:00" or "60:00"
    const cells = screen.getAllByRole('cell');
    expect(cells.some((c) => /1:00:00|60:00/.test(c.textContent ?? ''))).toBe(true);
  });

  it('renders a column per app used across rows', () => {
    render(<AggregateTable rows={rows} />);
    expect(screen.getByText(/VS Code %/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome %/)).toBeInTheDocument();
  });

  it('Export CSV triggers a download', async () => {
    const user = userEvent.setup();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    render(<AggregateTable rows={rows} />);
    await user.click(screen.getByRole('button', { name: /Export CSV/i }));
    expect(appendSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/aggregate/AggregateTable.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/aggregate/AggregateTable.tsx`:

```tsx
import { useMemo } from 'react';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatDuration } from '../../lib/time';
import type { AggregatedRow } from '../../lib/aggregate-range';

export type AggregateTableProps = {
  rows: AggregatedRow[];
};

export function AggregateTable({ rows }: AggregateTableProps) {
  const appColumns = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const s of r.breakdown) set.add(s.app);
    return Array.from(set).sort();
  }, [rows]);

  const headers = [
    'Task',
    'Total',
    'Sessions',
    'Avg session',
    ...appColumns.map((a) => `${a} %`),
  ];

  const tableRows = rows.map((r) => {
    const percentByApp = new Map(
      r.breakdown.map((s) => [s.app, s.percent] as const),
    );
    return [
      r.name,
      formatDuration(r.totalSec),
      String(r.sessionCount),
      formatDuration(r.avgSec),
      ...appColumns.map((a) => {
        const p = percentByApp.get(a);
        return p == null ? '' : `${p.toFixed(1)}%`;
      }),
    ];
  });

  function handleExport() {
    const csv = toCsv(headers, tableRows);
    downloadCsv(
      `buildtimetracker-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs tracking-[0.14em] uppercase text-muted">
          Table
        </h3>
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ⤓ Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-xs"
          aria-label="Aggregated task table"
        >
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-line px-2 py-1.5 font-medium text-muted uppercase tracking-wider text-[10px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className="text-ink-2">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-line/50 px-2 py-1.5 font-mono"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/aggregate/AggregateTable.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/aggregate/AggregateTable.tsx app/src/test/features/aggregate/AggregateTable.test.tsx
git commit -m "feat(aggregate): AggregateTable — re-skinned port of current AggregatedTable"
```

---

## Task 6.2: `features/aggregate/AggregatePage.tsx` — full reskin

**Files:**
- Modify: `app/src/features/aggregate/AggregatePage.tsx` (replace Phase 2 placeholder)
- Create: `app/src/test/features/aggregate/AggregatePage.test.tsx`

New layout:
- Serif h1 "Aggregate" + kicker with date range label.
- Date-range preset chips (`Today / Yesterday / Last 7d / Last 30d / Custom`) + from/to inputs.
- Task-name filter dropdown (unchanged from current).
- 4 KPI cards: Total tracked / Sessions / Tasks / Top task.
- Stacked bars (one per distinct task name, sorted by total, max-width scaled).
- Table below.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/aggregate/AggregatePage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AggregatePage } from '../../../features/aggregate/AggregatePage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  vi.spyOn(Date, 'now').mockReturnValue(
    new Date(2026, 3, 18, 17, 0, 0).getTime(),
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AggregatePage />
    </MemoryRouter>,
  );
}

describe('AggregatePage', () => {
  it('renders the header and 4 KPI labels', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Aggregate/i })).toBeInTheDocument();
    expect(screen.getByText(/Total tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/Tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/Top task/i)).toBeInTheDocument();
  });

  it('shows an empty-state message when no sessions in range', () => {
    renderPage();
    expect(
      screen.getByText(/No sessions overlap the selected range/i),
    ).toBeInTheDocument();
  });

  it('renders preset range chips', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last 7d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last 30d/i })).toBeInTheDocument();
  });

  it('updates KPI totals when seeded sessions exist in range', async () => {
    // Seed a completed session earlier today.
    useStore.setState({
      sessions: [
        {
          id: 's1',
          name: 'Deep work',
          startedAt: new Date(2026, 3, 18, 9, 0, 0).toISOString(),
          endedAt: new Date(2026, 3, 18, 10, 0, 0).toISOString(),
          events: [],
        },
      ],
    });
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Today' }));
    // "Deep work" should appear as the top task KPI or stacked-bar label
    expect(screen.getByText('Deep work')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/aggregate/AggregatePage.test.tsx
```

Expected: FAIL — placeholder doesn't have this structure.

- [ ] **Step 3: Implement**

Replace `app/src/features/aggregate/AggregatePage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  parseDateTimeLocal,
  startOfLocalDay,
  toDateTimeLocalValue,
  formatDuration,
  formatDurationShort,
} from '../../lib/time';
import { aggregateSessions } from '../../lib/aggregate-range';
import { AggregateTable } from './AggregateTable';
import { appColor } from '../../lib/colors';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;

function presetRange(p: Preset, now: Date): { from: Date; to: Date } | null {
  const startToday = startOfLocalDay(now);
  const endToday = new Date(startToday.getTime() + DAY_MS - 1);
  switch (p) {
    case 'today':
      return { from: startToday, to: endToday };
    case 'yesterday': {
      const y = new Date(startToday.getTime() - DAY_MS);
      return { from: y, to: new Date(y.getTime() + DAY_MS - 1) };
    }
    case '7d':
      return {
        from: new Date(startToday.getTime() - 6 * DAY_MS),
        to: endToday,
      };
    case '30d':
      return {
        from: new Date(startToday.getTime() - 29 * DAY_MS),
        to: endToday,
      };
    case 'custom':
      return null;
  }
}

export function AggregatePage() {
  const sessions = useStore((s) => s.sessions);

  const [preset, setPreset] = useState<Preset>('today');
  const [start, setStart] = useState(() =>
    toDateTimeLocalValue(startOfLocalDay()),
  );
  const [end, setEnd] = useState(() => toDateTimeLocalValue(new Date()));
  const [taskFilter, setTaskFilter] = useState('');

  function applyPreset(p: Preset) {
    setPreset(p);
    const r = presetRange(p, new Date(Date.now()));
    if (r) {
      setStart(toDateTimeLocalValue(r.from));
      setEnd(toDateTimeLocalValue(r.to));
    }
  }

  const distinctNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.name);
    return Array.from(set).sort();
  }, [sessions]);

  const rows = useMemo(() => {
    const sDate = parseDateTimeLocal(start);
    const eDate = parseDateTimeLocal(end);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return [];
    return aggregateSessions(
      sessions,
      sDate.toISOString(),
      eDate.toISOString(),
      taskFilter || undefined,
    );
  }, [sessions, start, end, taskFilter]);

  const maxTotal = rows.reduce((acc, r) => Math.max(acc, r.totalSec), 0);
  const totalSec = rows.reduce((a, r) => a + r.totalSec, 0);
  const sessionCount = rows.reduce((a, r) => a + r.sessionCount, 0);
  const taskCount = rows.length;
  const topTask = rows[0]?.name ?? '—';

  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            {start.slice(0, 10)} – {end.slice(0, 10)}
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            Aggregate
          </h1>
          <p className="text-sm text-ink-2 mt-1">
            Totals and breakdowns across a range of days.
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
          {(['today', 'yesterday', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={[
                'px-3 py-1.5 text-xs border-r border-line last:border-r-0',
                preset === p
                  ? 'bg-bg-3 text-ink shadow-[inset_0_-2px_0] shadow-accent'
                  : 'text-ink-2 hover:bg-bg-2',
              ].join(' ')}
            >
              {p === 'today'
                ? 'Today'
                : p === 'yesterday'
                  ? 'Yesterday'
                  : p === '7d'
                    ? 'Last 7d'
                    : 'Last 30d'}
            </button>
          ))}
          <button
            onClick={() => applyPreset('custom')}
            className={[
              'px-3 py-1.5 text-xs',
              preset === 'custom'
                ? 'bg-bg-3 text-ink'
                : 'text-ink-2 hover:bg-bg-2',
            ].join(' ')}
          >
            Custom
          </button>
        </div>

        <div className="flex items-center gap-2 bg-bg-1 border border-line rounded-lg px-2 py-1.5">
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => {
              setPreset('custom');
              setStart(e.target.value);
            }}
            aria-label="Range start"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
          <span className="text-muted-2">→</span>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => {
              setPreset('custom');
              setEnd(e.target.value);
            }}
            aria-label="Range end"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
        </div>

        <select
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value)}
          aria-label="Task filter"
          className="bg-bg-1 border border-line rounded-lg px-3 py-1.5 text-xs text-ink-2"
        >
          <option value="">All tasks</option>
          {distinctNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard label="Total tracked" value={formatDurationShort(totalSec)} />
        <KpiCard label="Sessions" value={String(sessionCount)} />
        <KpiCard label="Tasks" value={String(taskCount)} />
        <KpiCard label="Top task" value={topTask} />
      </div>

      {/* Stacked bars + table */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          No sessions overlap the selected range.
        </p>
      ) : (
        <>
          <ul className="mb-8 flex flex-col gap-2 list-none p-0">
            {rows.map((r) => {
              const widthPct =
                maxTotal > 0 ? (r.totalSec / maxTotal) * 100 : 0;
              return (
                <li
                  key={r.name}
                  data-testid={`agg-row-${r.name}`}
                  className="grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-3"
                >
                  <div className="truncate text-sm text-ink-2">{r.name}</div>
                  <div className="h-6 rounded bg-bg-1">
                    <div
                      className="flex h-full overflow-hidden rounded"
                      style={{ width: `${Math.max(2, widthPct)}%` }}
                    >
                      {r.breakdown.map((slice) => (
                        <div
                          key={slice.app}
                          style={{
                            width: `${slice.percent}%`,
                            backgroundColor: appColor(slice.app),
                          }}
                          title={`${slice.app} · ${formatDuration(slice.seconds)}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="whitespace-nowrap font-mono text-xs tabular-nums text-ink-2">
                    {formatDuration(r.totalSec)} · {r.sessionCount}×
                  </div>
                </li>
              );
            })}
          </ul>
          <AggregateTable rows={rows} />
        </>
      )}
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-1 border border-line rounded-lg px-5 py-4">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted">
        {label}
      </div>
      <div className="font-serif text-2xl text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {value}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/aggregate/AggregatePage.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Navigate to `/aggregate`:
- Header shows "Aggregate" + date range.
- Preset chips work; clicking "Last 7d" rolls the range.
- Task filter dropdown shows all recorded task names.
- If you have sessions seeded, KPI cards reflect totals.
- Stacked bars + table render; CSV export downloads a file.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/aggregate/AggregatePage.tsx app/src/test/features/aggregate/AggregatePage.test.tsx
git commit -m "feat(aggregate): AggregatePage — Direction D reskin with KPI cards + preset ranges"
```

---

## Phase 6 exit checklist

- [ ] `npm run test:run -- src/test/features/aggregate/` passes.
- [ ] `npm run build` passes.
- [ ] Manual smoke test on `/aggregate` passes.
- [ ] Commit log contains 2 commits.

Phase 7 (Web + Report + Cleanup) picks up here.
