# Direction D Rebuild — Phase 7: Web tab + /report + Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Web tab (domain / category / timeline grouping), the printable `/report` page, and remove all residual Phase-0 code (`src/components/*`, old tests, unused deps, tsconfig exclusions).

**Architecture:** The Web tab fetches events from `aw-watcher-web` via the `findWebBucket` / `fetchWebEvents` helpers added in Phase 1. Three view modes share the same visit array. `WebReport` is a standalone route that renders the same three views but without navigation chrome and with `@media print` rules. Cleanup reverts Phase 2's tsconfig exclusion once the old components are gone.

**Tech Stack:** React 18, Tailwind, Vitest + @testing-library/react. No new deps.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

**Preconditions:** Phases 1–6 merged.

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

---

## Task 7.1: `lib/web.ts` — shared Web data helpers

Shared logic: turn `WebEvent[]` into `WebVisit[]`, group by domain, group by category. These are consumed by both `WebPage` and `WebReport`.

**Files:**
- Create: `app/src/lib/web.ts`
- Create: `app/src/test/lib/web.test.ts`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/lib/web.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  eventsToVisits,
  groupByDomain,
  groupByCategory,
} from '../../lib/web';
import type { WebEvent } from '../../types';

function ev(iso: string, url: string, title: string, duration: number): WebEvent {
  return { timestamp: iso, duration, data: { url, title } };
}

describe('eventsToVisits', () => {
  it('extracts the domain from the URL', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/foo/bar', 'Bar', 60),
    ]);
    expect(visits).toHaveLength(1);
    expect(visits[0].domain).toBe('github.com');
    expect(visits[0].url).toBe('https://github.com/foo/bar');
    expect(visits[0].title).toBe('Bar');
    expect(visits[0].duration).toBe(60);
  });

  it('uses data.domain when provided', () => {
    const visits = eventsToVisits([
      {
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 30,
        data: { url: 'x', title: 'x', domain: 'override.test' },
      },
    ]);
    expect(visits[0].domain).toBe('override.test');
  });
});

describe('groupByDomain', () => {
  it('sums durations and ranks by time desc', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/a', 'A', 60),
      ev('2026-04-18T09:02:00.000Z', 'https://github.com/b', 'B', 30),
      ev('2026-04-18T09:04:00.000Z', 'https://linear.app/', 'Linear', 120),
    ]);
    const grouped = groupByDomain(visits);
    expect(grouped[0].domain).toBe('linear.app');
    expect(grouped[0].seconds).toBe(120);
    expect(grouped[1].domain).toBe('github.com');
    expect(grouped[1].seconds).toBe(90);
    expect(grouped[1].count).toBe(2);
    expect(grouped[1].urls).toHaveLength(2);
  });
});

describe('groupByCategory', () => {
  it('aggregates by DomainMeta category, unknowns → Other', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/a', 'A', 60),
      ev('2026-04-18T09:02:00.000Z', 'https://slack.com/', 'Slack', 30),
      ev('2026-04-18T09:04:00.000Z', 'https://random.test/', 'Who', 10),
    ]);
    const grouped = groupByCategory(visits);
    const cats = grouped.map((g) => g.category);
    expect(cats).toContain('Code');
    expect(cats).toContain('Comms');
    expect(cats).toContain('Other');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/lib/web.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/lib/web.ts`:

```ts
import type { WebCategory, WebEvent, WebVisit } from '../types';
import { domainCategory, extractDomain } from './web-categories';

export function eventsToVisits(events: WebEvent[]): WebVisit[] {
  return events.map((e) => ({
    timestamp: e.timestamp,
    domain: e.data.domain ?? extractDomain(e.data.url),
    url: e.data.url,
    title: e.data.title,
    duration: e.duration,
  }));
}

export type DomainGroup = {
  domain: string;
  seconds: number;
  count: number;
  urls: { url: string; title: string; seconds: number; count: number }[];
};

export function groupByDomain(visits: WebVisit[]): DomainGroup[] {
  const domains = new Map<string, DomainGroup>();
  for (const v of visits) {
    const entry =
      domains.get(v.domain) ??
      ({ domain: v.domain, seconds: 0, count: 0, urls: [] } as DomainGroup);
    entry.seconds += v.duration;
    entry.count += 1;

    const existing = entry.urls.find((u) => u.url === v.url);
    if (existing) {
      existing.seconds += v.duration;
      existing.count += 1;
    } else {
      entry.urls.push({
        url: v.url,
        title: v.title,
        seconds: v.duration,
        count: 1,
      });
    }
    domains.set(v.domain, entry);
  }
  const out = Array.from(domains.values());
  for (const d of out) {
    d.urls.sort((a, b) => b.seconds - a.seconds);
  }
  out.sort((a, b) => b.seconds - a.seconds);
  return out;
}

export type CategoryGroup = {
  category: WebCategory;
  seconds: number;
  count: number;
  domains: { domain: string; seconds: number }[];
};

export function groupByCategory(visits: WebVisit[]): CategoryGroup[] {
  const cats = new Map<WebCategory, CategoryGroup>();
  for (const v of visits) {
    const c = domainCategory(v.domain);
    const entry =
      cats.get(c) ??
      ({ category: c, seconds: 0, count: 0, domains: [] } as CategoryGroup);
    entry.seconds += v.duration;
    entry.count += 1;
    const d = entry.domains.find((x) => x.domain === v.domain);
    if (d) d.seconds += v.duration;
    else entry.domains.push({ domain: v.domain, seconds: v.duration });
    cats.set(c, entry);
  }
  const out = Array.from(cats.values());
  for (const c of out) {
    c.domains.sort((a, b) => b.seconds - a.seconds);
  }
  out.sort((a, b) => b.seconds - a.seconds);
  return out;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/lib/web.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/web.ts app/src/test/lib/web.test.ts
git commit -m "feat(lib): add web.ts — eventsToVisits, groupByDomain, groupByCategory"
```

---

## Task 7.2: `features/web/DomainsView.tsx`

**Files:**
- Create: `app/src/features/web/DomainsView.tsx`
- Create: `app/src/test/features/web/DomainsView.test.tsx`

Table-like grid: favicon tile, domain name, category chip, visit count, share bar, total time. Row click expands to a sub-list of per-URL rows.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/web/DomainsView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DomainsView } from '../../../features/web/DomainsView';
import { eventsToVisits } from '../../../lib/web';

function visits() {
  return eventsToVisits([
    {
      timestamp: '2026-04-18T09:00:00.000Z',
      duration: 120,
      data: { url: 'https://github.com/a', title: 'A' },
    },
    {
      timestamp: '2026-04-18T09:02:00.000Z',
      duration: 60,
      data: { url: 'https://github.com/b', title: 'B' },
    },
    {
      timestamp: '2026-04-18T09:05:00.000Z',
      duration: 30,
      data: { url: 'https://slack.com/', title: 'Slack' },
    },
  ]);
}

describe('DomainsView', () => {
  it('renders a row per domain', () => {
    render(<DomainsView visits={visits()} />);
    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('slack.com')).toBeInTheDocument();
  });

  it('shows empty state when no visits', () => {
    render(<DomainsView visits={[]} />);
    expect(screen.getByText(/No web visits/i)).toBeInTheDocument();
  });

  it('expands to show per-URL rows when clicked', async () => {
    const user = userEvent.setup();
    render(<DomainsView visits={visits()} />);
    await user.click(screen.getByText('github.com'));
    // Two URLs under github.com — look for their titles
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/web/DomainsView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/web/DomainsView.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { WebVisit } from '../../types';
import { groupByDomain } from '../../lib/web';
import { domainCategory, domainFavicon } from '../../lib/web-categories';
import { formatDurationShort } from '../../lib/time';

const CAT_COLOR: Record<string, string> = {
  Code: '#7AA2F7',
  Docs: '#38BDF8',
  Work: '#A78BFA',
  Comms: '#F59E0B',
  News: '#E5E7EB',
  Social: '#FB7185',
  Entertainment: '#F472B6',
  Shopping: '#FBBF24',
  AI: '#6EE7A7',
  Other: '#94A3B8',
};

export function DomainsView({ visits }: { visits: WebVisit[] }) {
  const grouped = useMemo(() => groupByDomain(visits), [visits]);
  const [open, setOpen] = useState<string | null>(null);
  const max = grouped[0]?.seconds ?? 1;

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(120px,auto)_60px_1fr_80px] gap-3 px-3 py-2 text-[10px] tracking-[0.1em] uppercase text-muted border-b border-line">
        <div />
        <div>Domain</div>
        <div>Category</div>
        <div className="text-right">Visits</div>
        <div>Share</div>
        <div className="text-right">Time</div>
      </div>
      {grouped.map((d) => {
        const cat = domainCategory(d.domain);
        const color = CAT_COLOR[cat];
        const pct = (d.seconds / max) * 100;
        const isOpen = open === d.domain;
        return (
          <div key={d.domain}>
            <button
              onClick={() => setOpen(isOpen ? null : d.domain)}
              className="w-full grid grid-cols-[28px_minmax(0,1fr)_minmax(120px,auto)_60px_1fr_80px] gap-3 items-center px-3 py-3 border-b border-line/50 hover:bg-bg-1 text-left"
            >
              <span
                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[11px] font-mono text-[#0b0c10]"
                style={{ background: color }}
              >
                {domainFavicon(d.domain)}
              </span>
              <div className="min-w-0">
                <div className="text-ink-2 truncate">{d.domain}</div>
                <div className="text-[11px] text-muted">
                  {d.urls.length} page{d.urls.length !== 1 ? 's' : ''} · click to expand
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                />
                {cat}
              </span>
              <span className="text-right font-mono text-xs text-muted">
                {d.count}
              </span>
              <div className="h-2 rounded-sm bg-bg-1 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span className="text-right font-mono text-xs text-ink-2">
                {formatDurationShort(d.seconds)}
              </span>
            </button>
            {isOpen && (
              <div className="bg-bg-1/50 border-b border-line/50">
                {d.urls.slice(0, 12).map((u) => (
                  <div
                    key={u.url}
                    className="grid grid-cols-[28px_minmax(0,1fr)_60px_80px] gap-3 items-center px-3 py-2 text-[11px]"
                  >
                    <span />
                    <span className="text-ink-2 truncate" title={u.url}>
                      {u.title || u.url}
                    </span>
                    <span className="text-right font-mono text-muted">
                      {u.count}×
                    </span>
                    <span className="text-right font-mono text-ink-2">
                      {formatDurationShort(u.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/web/DomainsView.test.tsx
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/web/DomainsView.tsx app/src/test/features/web/DomainsView.test.tsx
git commit -m "feat(web): DomainsView — expandable per-domain rows"
```

---

## Task 7.3: `features/web/CategoriesView.tsx`

**Files:**
- Create: `app/src/features/web/CategoriesView.tsx`
- Create: `app/src/test/features/web/CategoriesView.test.tsx`

Per-category panels: name + total, percent of web time, top domains.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/web/CategoriesView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoriesView } from '../../../features/web/CategoriesView';
import { eventsToVisits } from '../../../lib/web';

describe('CategoriesView', () => {
  it('renders a panel per category', () => {
    const visits = eventsToVisits([
      {
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 60,
        data: { url: 'https://github.com/a', title: 'A' },
      },
      {
        timestamp: '2026-04-18T09:02:00.000Z',
        duration: 30,
        data: { url: 'https://slack.com/', title: 'S' },
      },
    ]);
    render(<CategoriesView visits={visits} />);
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Comms')).toBeInTheDocument();
  });

  it('renders empty state when no visits', () => {
    render(<CategoriesView visits={[]} />);
    expect(screen.getByText(/No web visits/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/web/CategoriesView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/web/CategoriesView.tsx`:

```tsx
import { useMemo } from 'react';
import type { WebVisit } from '../../types';
import { groupByCategory } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';

const CAT_COLOR: Record<string, string> = {
  Code: '#7AA2F7',
  Docs: '#38BDF8',
  Work: '#A78BFA',
  Comms: '#F59E0B',
  News: '#E5E7EB',
  Social: '#FB7185',
  Entertainment: '#F472B6',
  Shopping: '#FBBF24',
  AI: '#6EE7A7',
  Other: '#94A3B8',
};

export function CategoriesView({ visits }: { visits: WebVisit[] }) {
  const grouped = useMemo(() => groupByCategory(visits), [visits]);
  const total = grouped.reduce((a, c) => a + c.seconds, 0) || 1;

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {grouped.map((c) => {
        const color = CAT_COLOR[c.category];
        const pct = (c.seconds / total) * 100;
        return (
          <section
            key={c.category}
            className="rounded-lg border p-4"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}08)`,
              borderColor: `${color}44`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span
                  className="font-serif text-lg"
                  style={{ color }}
                >
                  {c.category}
                </span>
              </div>
              <div className="font-mono text-sm text-ink-2">
                {formatDurationShort(c.seconds)}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-muted mb-3">
              <span>{pct.toFixed(0)}% of web time</span>
              <span>
                {c.domains.length} domain{c.domains.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1">
              {c.domains.slice(0, 8).map((d) => (
                <li
                  key={d.domain}
                  className="flex justify-between text-xs text-ink-2"
                >
                  <span className="truncate">{d.domain}</span>
                  <span className="font-mono text-muted">
                    {formatDurationShort(d.seconds)}
                  </span>
                </li>
              ))}
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
npm run test:run -- src/test/features/web/CategoriesView.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/web/CategoriesView.tsx app/src/test/features/web/CategoriesView.test.tsx
git commit -m "feat(web): CategoriesView — per-category panels with top domains"
```

---

## Task 7.4: `features/web/TimelineVisitsView.tsx`

**Files:**
- Create: `app/src/features/web/TimelineVisitsView.tsx`
- Create: `app/src/test/features/web/TimelineVisitsView.test.tsx`

Simple chronological list of visits: time, favicon, domain, title, duration.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/web/TimelineVisitsView.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineVisitsView } from '../../../features/web/TimelineVisitsView';
import { eventsToVisits } from '../../../lib/web';

describe('TimelineVisitsView', () => {
  it('renders one row per visit in chronological order', () => {
    const visits = eventsToVisits([
      {
        timestamp: '2026-04-18T10:00:00.000Z',
        duration: 60,
        data: { url: 'https://github.com/a', title: 'Later' },
      },
      {
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 30,
        data: { url: 'https://slack.com/', title: 'Earlier' },
      },
    ]);
    render(<TimelineVisitsView visits={visits} />);
    const titles = screen.getAllByTestId('visit-title');
    expect(titles[0].textContent).toBe('Earlier');
    expect(titles[1].textContent).toBe('Later');
  });

  it('renders empty state', () => {
    render(<TimelineVisitsView visits={[]} />);
    expect(screen.getByText(/No web visits/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/web/TimelineVisitsView.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/src/features/web/TimelineVisitsView.tsx`:

```tsx
import { useMemo } from 'react';
import type { WebVisit } from '../../types';
import { domainCategory, domainFavicon } from '../../lib/web-categories';
import { formatClock, formatDurationShort } from '../../lib/time';

const CAT_COLOR: Record<string, string> = {
  Code: '#7AA2F7',
  Docs: '#38BDF8',
  Work: '#A78BFA',
  Comms: '#F59E0B',
  News: '#E5E7EB',
  Social: '#FB7185',
  Entertainment: '#F472B6',
  Shopping: '#FBBF24',
  AI: '#6EE7A7',
  Other: '#94A3B8',
};

export function TimelineVisitsView({ visits }: { visits: WebVisit[] }) {
  const sorted = useMemo(
    () =>
      [...visits].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [visits],
  );

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <ul className="list-none p-0 m-0">
      {sorted.map((v, i) => {
        const color = CAT_COLOR[domainCategory(v.domain)];
        return (
          <li
            key={`${v.timestamp}-${i}`}
            className="grid grid-cols-[60px_24px_140px_1fr_60px] gap-3 items-center py-1.5 px-2 text-xs hover:bg-bg-1 rounded"
          >
            <span className="font-mono text-muted">{formatClock(v.timestamp)}</span>
            <span
              className="w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-mono text-[#0b0c10]"
              style={{ background: color }}
            >
              {domainFavicon(v.domain)}
            </span>
            <span className="text-ink-2 font-mono truncate">{v.domain}</span>
            <span className="text-ink truncate" data-testid="visit-title">
              {v.title || v.url}
            </span>
            <span className="text-right font-mono text-muted">
              {formatDurationShort(v.duration)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/web/TimelineVisitsView.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/web/TimelineVisitsView.tsx app/src/test/features/web/TimelineVisitsView.test.tsx
git commit -m "feat(web): TimelineVisitsView — chronological per-visit list"
```

---

## Task 7.5: `features/web/WebPage.tsx` — full wiring

**Files:**
- Modify: `app/src/features/web/WebPage.tsx` (replace Phase 2 placeholder)
- Create: `app/src/test/features/web/WebPage.test.tsx`

Full page: header, date-range picker + group-by toggle, 4 KPI stats, one of three views, Export CSV + Full report buttons.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/web/WebPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebPage } from '../../../features/web/WebPage';
import { useStore } from '../../../store/useStore';
import * as aw from '../../../lib/activitywatch';

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
      <WebPage />
    </MemoryRouter>,
  );
}

describe('WebPage', () => {
  it('shows the install-extension empty state when no web bucket found', async () => {
    vi.spyOn(aw, 'findWebBucket').mockResolvedValue(null);
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/install aw-watcher-web/i),
      ).toBeInTheDocument();
    });
  });

  it('fetches and renders visits when a bucket exists', async () => {
    vi.spyOn(aw, 'findWebBucket').mockResolvedValue('aw-watcher-web-chrome_host');
    vi.spyOn(aw, 'fetchWebEvents').mockResolvedValue([
      {
        timestamp: '2026-04-18T10:00:00.000Z',
        duration: 120,
        data: { url: 'https://github.com/foo', title: 'foo' },
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('github.com')).toBeInTheDocument();
    });
  });

  it('renders the three group-by toggle buttons', async () => {
    vi.spyOn(aw, 'findWebBucket').mockResolvedValue('bucket');
    vi.spyOn(aw, 'fetchWebEvents').mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Domain' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('shows a Full report link that points at /report', async () => {
    vi.spyOn(aw, 'findWebBucket').mockResolvedValue('bucket');
    vi.spyOn(aw, 'fetchWebEvents').mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /full report/i }) as HTMLAnchorElement;
      expect(link.href).toContain('/report');
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/web/WebPage.test.tsx
```

Expected: FAIL — placeholder has none of this.

- [ ] **Step 3: Implement**

Replace `app/src/features/web/WebPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';
import { eventsToVisits, groupByDomain } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';
import { downloadCsv, toCsv } from '../../lib/csv';
import { domainCategory } from '../../lib/web-categories';
import { DomainsView } from './DomainsView';
import { CategoriesView } from './CategoriesView';
import { TimelineVisitsView } from './TimelineVisitsView';
import type { WebEvent, WebVisit } from '../../types';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type Group = 'domain' | 'category' | 'timeline';

const DAY_MS = 24 * 60 * 60 * 1000;

function presetRange(p: Preset, now: Date): { from: string; to: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  switch (p) {
    case 'today':
      return { from: iso(t), to: iso(t) };
    case 'yesterday': {
      const y = new Date(t.getTime() - DAY_MS);
      return { from: iso(y), to: iso(y) };
    }
    case '7d':
      return { from: iso(new Date(t.getTime() - 6 * DAY_MS)), to: iso(t) };
    case '30d':
      return { from: iso(new Date(t.getTime() - 29 * DAY_MS)), to: iso(t) };
    case 'custom':
      return { from: iso(t), to: iso(t) };
  }
}

export function WebPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const initial = presetRange('7d', new Date(Date.now()));
  const [fromIso, setFromIso] = useState(initial.from);
  const [toIso, setToIso] = useState(initial.to);
  const [group, setGroup] = useState<Group>('domain');

  const [bucketId, setBucketId] = useState<string | null | undefined>(undefined);
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Resolve the bucket once on mount
  useEffect(() => {
    findWebBucket()
      .then((id) => setBucketId(id))
      .catch(() => setBucketId(null));
  }, []);

  // Fetch events whenever range or bucket changes
  useEffect(() => {
    if (!bucketId) return;
    setLoading(true);
    setLoadError(null);
    const start = new Date(`${fromIso}T00:00:00`).toISOString();
    const end = new Date(`${toIso}T23:59:59`).toISOString();
    fetchWebEvents(bucketId, start, end)
      .then(setEvents)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [bucketId, fromIso, toIso]);

  const visits: WebVisit[] = useMemo(() => eventsToVisits(events), [events]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') {
      const r = presetRange(p, new Date(Date.now()));
      setFromIso(r.from);
      setToIso(r.to);
    }
  }

  function exportCsv() {
    const headers = ['timestamp', 'domain', 'url', 'title', 'duration_seconds', 'category'];
    const rows = visits.map((v) => [
      v.timestamp,
      v.domain,
      v.url,
      v.title ?? '',
      String(v.duration),
      domainCategory(v.domain),
    ]);
    downloadCsv(`web-activity-${fromIso}_to_${toIso}.csv`, toCsv(headers, rows));
  }

  const totalSec = visits.reduce((a, v) => a + v.duration, 0);
  const domains = useMemo(() => groupByDomain(visits), [visits]);
  const uniqueDomains = domains.length;
  const uniqueCats = new Set(visits.map((v) => domainCategory(v.domain))).size;
  const busiest = domains[0]?.domain ?? '—';
  const longest = visits.reduce((a, v) => Math.max(a, v.duration), 0);

  // Bucket not yet resolved
  if (bucketId === undefined) {
    return (
      <main className="max-w-[1280px] mx-auto px-7 py-6 text-muted">
        Looking for aw-watcher-web…
      </main>
    );
  }

  if (bucketId === null) {
    return (
      <main className="max-w-[1280px] mx-auto px-7 py-6">
        <header className="mb-4">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Web activity
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            Sites you visited
          </h1>
        </header>
        <div className="rounded-lg border border-line-2 bg-bg-1 px-6 py-8 text-sm text-ink-2">
          No <code>aw-watcher-web</code> bucket found. Install the browser
          extension from the{' '}
          <a
            className="text-accent hover:underline"
            href="https://activitywatch.net/downloads/"
            target="_blank"
            rel="noreferrer"
          >
            ActivityWatch downloads page
          </a>{' '}
          in every browser you want tracked. Once it's running, refresh this
          page.
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6">
      <header className="mb-5">
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
          Web activity
        </div>
        <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
          Sites you visited
        </h1>
        <div className="text-sm text-ink-2 mt-1">
          From aw-watcher-web · {fromIso} – {toIso} · {uniqueDomains} domains ·{' '}
          {uniqueCats} categories
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
                  ? 'bg-bg-3 text-ink'
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
        </div>

        <div className="flex items-center gap-2 bg-bg-1 border border-line rounded-lg px-2 py-1.5">
          <input
            type="date"
            value={fromIso}
            onChange={(e) => {
              setPreset('custom');
              setFromIso(e.target.value);
            }}
            aria-label="From date"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
          <span className="text-muted-2">→</span>
          <input
            type="date"
            value={toIso}
            onChange={(e) => {
              setPreset('custom');
              setToIso(e.target.value);
            }}
            aria-label="To date"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
        </div>

        <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
          {(['domain', 'category', 'timeline'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={[
                'px-3 py-1.5 text-xs border-r border-line last:border-r-0',
                group === g
                  ? 'bg-bg-3 text-ink'
                  : 'text-ink-2 hover:bg-bg-2',
              ].join(' ')}
            >
              {g === 'domain' ? 'Domain' : g === 'category' ? 'Category' : 'Timeline'}
            </button>
          ))}
        </div>

        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg text-xs text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ⤓ Export CSV
        </button>
        <a
          href={`/report?from=${fromIso}&to=${toIso}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ↗ Full report
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard label="Total web time" value={formatDurationShort(totalSec)} hint={`${visits.length} visits`} />
        <KpiCard label="Domains" value={String(uniqueDomains)} hint={`${uniqueCats} categories`} />
        <KpiCard label="Busiest" value={busiest} hint="by time on page" />
        <KpiCard
          label="Longest visit"
          value={longest > 0 ? formatDurationShort(longest) : '—'}
          hint="single stretch"
        />
      </div>

      {loading && <div className="text-sm text-muted">Loading…</div>}
      {loadError && (
        <div className="text-sm text-bad mb-3">Failed: {loadError}</div>
      )}

      {group === 'domain' && <DomainsView visits={visits} />}
      {group === 'category' && <CategoriesView visits={visits} />}
      {group === 'timeline' && <TimelineVisitsView visits={visits} />}
    </main>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-bg-1 border border-line rounded-lg px-5 py-4">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted">
        {label}
      </div>
      <div className="font-serif text-2xl text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/web/WebPage.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/web/WebPage.tsx app/src/test/features/web/WebPage.test.tsx
git commit -m "feat(web): WebPage — range picker, group-by toggle, KPIs, domain/category/timeline views"
```

---

## Task 7.6: `features/web/WebReport.tsx` — printable `/report`

**Files:**
- Modify: `app/src/features/web/WebReport.tsx` (replace Phase 2 placeholder)
- Create: `app/src/test/features/web/WebReport.test.tsx`

No chrome. Reads `?from=&to=` from the URL. Renders a header + all three views in sequence. `@media print` styles.

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/web/WebReport.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebReport } from '../../../features/web/WebReport';
import * as aw from '../../../lib/activitywatch';

beforeEach(() => {
  vi.spyOn(aw, 'findWebBucket').mockResolvedValue('bucket');
  vi.spyOn(aw, 'fetchWebEvents').mockResolvedValue([]);
});

describe('WebReport', () => {
  it('renders a report header and three section labels', async () => {
    render(
      <MemoryRouter initialEntries={['/report?from=2026-04-12&to=2026-04-18']}>
        <WebReport />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/Web activity report/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2026-04-12/)).toBeInTheDocument();
    expect(screen.getByText(/2026-04-18/)).toBeInTheDocument();
    // Section headers
    expect(screen.getByText(/Domains/i)).toBeInTheDocument();
    expect(screen.getByText(/Categories/i)).toBeInTheDocument();
    expect(screen.getByText(/Timeline/i)).toBeInTheDocument();
  });

  it('renders a Print button', async () => {
    render(
      <MemoryRouter initialEntries={['/report?from=2026-04-12&to=2026-04-18']}>
        <WebReport />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/web/WebReport.test.tsx
```

Expected: FAIL — placeholder doesn't render the structure.

- [ ] **Step 3: Implement**

Replace `app/src/features/web/WebReport.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';
import { eventsToVisits, groupByDomain } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';
import { domainCategory } from '../../lib/web-categories';
import { DomainsView } from './DomainsView';
import { CategoriesView } from './CategoriesView';
import { TimelineVisitsView } from './TimelineVisitsView';
import type { WebEvent, WebVisit } from '../../types';

export function WebReport() {
  const [params] = useSearchParams();
  const fromIso = params.get('from') ?? new Date().toISOString().slice(0, 10);
  const toIso = params.get('to') ?? fromIso;

  const [events, setEvents] = useState<WebEvent[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const bucket = await findWebBucket();
        if (!bucket) {
          setEvents([]);
          return;
        }
        const start = new Date(`${fromIso}T00:00:00`).toISOString();
        const end = new Date(`${toIso}T23:59:59`).toISOString();
        const evts = await fetchWebEvents(bucket, start, end);
        setEvents(evts);
      } catch {
        setEvents([]);
      }
    })();
  }, [fromIso, toIso]);

  const visits: WebVisit[] = useMemo(
    () => (events ? eventsToVisits(events) : []),
    [events],
  );

  const totalSec = visits.reduce((a, v) => a + v.duration, 0);
  const domains = useMemo(() => groupByDomain(visits), [visits]);
  const uniqueCats = new Set(visits.map((v) => domainCategory(v.domain))).size;

  function print() {
    window.print();
  }

  if (events === null) {
    return (
      <main className="max-w-[900px] mx-auto px-10 py-12 bg-white text-black">
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-[900px] mx-auto px-10 py-12 bg-white text-black print:py-0">
      <style>{`
        @media print {
          html, body { background: white !important; color: black !important; }
          .report-no-print { display: none !important; }
          .report-section { page-break-inside: avoid; }
          section { page-break-inside: avoid; }
          a { color: black !important; }
        }
      `}</style>

      <header className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-neutral-600">
            Web activity report
          </div>
          <h1 className="font-serif text-4xl mt-1 text-black">Web activity</h1>
          <div className="text-sm mt-1">
            <strong>{fromIso}</strong> – <strong>{toIso}</strong> ·{' '}
            {formatDurationShort(totalSec)} across {domains.length} domains ·{' '}
            {uniqueCats} categories
          </div>
        </div>
        <button
          onClick={print}
          className="report-no-print px-4 py-2 bg-black text-white rounded text-sm"
        >
          Print
        </button>
      </header>

      <section className="report-section mb-10">
        <h2 className="font-serif text-2xl mb-4">Domains</h2>
        <div className="text-black">
          <DomainsView visits={visits} />
        </div>
      </section>

      <section className="report-section mb-10">
        <h2 className="font-serif text-2xl mb-4">Categories</h2>
        <CategoriesView visits={visits} />
      </section>

      <section className="report-section">
        <h2 className="font-serif text-2xl mb-4">Timeline</h2>
        <TimelineVisitsView visits={visits} />
      </section>
    </main>
  );
}
```

Note: the report intentionally reuses the three views unchanged. The dark-theme Tailwind classes inside those views won't always render perfectly on the white background, but they print legibly because Tailwind's `bg-*` / `text-*` classes compile to computed colors that the browser can still render. The `@media print` block forces background: white for the page.

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/web/WebReport.test.tsx
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Navigate to `/web`. Click "Full report" — a new tab opens at `/report?from=…&to=…` showing the three sections. Click Print → the browser print dialog opens. Close. Return to the Web tab; all three group-by modes work; Export CSV downloads.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/web/WebReport.tsx app/src/test/features/web/WebReport.test.tsx
git commit -m "feat(web): WebReport — chromeless /report with three sections + print"
```

---

## Task 7.7: Delete old `src/components/*` + old tests + `@dnd-kit` deps

**Files:**
- Delete: `app/src/components/**`
- Delete: `app/src/test/components/**`
- Modify: `app/package.json` (remove `@dnd-kit/*`)
- Modify: `app/tsconfig.app.json` (remove the Phase 2 `exclude`)

- [ ] **Step 1: Delete old component files**

```bash
git rm -r app/src/components
git rm -r app/src/test/components
```

- [ ] **Step 2: Remove `@dnd-kit` dependencies**

```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: `package.json` dependencies now list only `react`, `react-dom`, `react-router-dom`, `zustand`.

- [ ] **Step 3: Remove the temp `exclude` from `tsconfig.app.json`**

Edit `app/tsconfig.app.json` — remove the `exclude` array added in Phase 2. Final file should have only `compilerOptions` and `include: ["src"]`.

- [ ] **Step 4: Verify the build is clean end-to-end**

Run:

```bash
npm run build
```

Expected: PASS with no errors, no warnings about missing files.

Run:

```bash
npm run test:run
```

Expected: all tests pass (lib + store + features). Total: ~80+ tests depending on exact count.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(cleanup): remove old src/components/*, @dnd-kit deps, tsc exclude"
```

---

## Task 7.8: Final verification + README update

**Files:**
- Modify: `README.md`
- Modify: `app/CLAUDE.md`

- [ ] **Step 1: Update `README.md` Features section**

Replace the existing `## Features` section with:

```markdown
## Features

### Today
- **Active card** — idle text input + Recent chips, or running timer + Stop + Inspect.
- **Film strip** — compressed day-wide bar of segments for a glance at the whole day.
- **Scene ribbon** — one card per task with rail, time, title, focus score ("deep" / "mixed" / "scattered"), colored mini-strip, top apps, switches.
- **Drawer** — slides in from the right; full stats (switches, longest, top app), attention trace, app breakdown, event log, Rename and Resume/Stop actions.
- **Command bar** — ⌘K opens a fuzzy finder for tasks and view jumps.
- **Category filter** — chip row to narrow the ribbon by code / creative / comm / meeting / browse.
- **Keyboard shortcuts** — `j` / `k` navigate the ribbon, `⌘K` opens search, `Esc` closes cmd bar → drawer.

### Week
- **7-day timeline** (8 am – 8 pm) with segments per session.
- **Focus sparkline** — 7-point daily focus trend.
- **What you shipped** — per-day list of completed tasks with hover cross-highlight to the timeline.

### Aggregate
- Preset ranges (Today / Yesterday / Last 7d / Last 30d / Custom) + task-name filter.
- 4 KPI cards (Total tracked / Sessions / Tasks / Top task).
- Stacked bars per task + sortable CSV export table.

### Web (requires `aw-watcher-web` browser extension)
- Range picker + group-by toggle (Domain / Category / Timeline).
- KPI stats, per-domain expandable rows with per-URL breakdown, category panels, chronological timeline.
- **/report** — standalone printable report tuned for A4.
```

- [ ] **Step 2: Update `app/CLAUDE.md` architecture section**

Replace the Architecture and Project structure sections to reflect the new layout. Key changes:
- Add `features/` layout.
- Drop `@dnd-kit/*` references.
- Remove `ImportExport`, `AppBreakdown` mentions.
- Add the `focus score`, `categories`, `segments`, `web` lib modules to the list.
- Add react-router-dom note: URL drives tab state.
- Note that `active session events not polled` is intentional (see deferred list in spec).

Use the spec's architecture section as the source of truth for what to write.

- [ ] **Step 3: Final manual QA**

Start the dev server and walk through, with ActivityWatch running:

```bash
npm run dev
```

Visit in order:
1. `/today` → Start a task, let it run for ~30 seconds, Stop. Confirm it appears as a scene card with a focus score.
2. Click the scene → drawer opens with stats. Try Rename; confirm it persists after a refresh.
3. Press `⌘K` → command bar opens. Type a partial task name → the task appears. Press Enter → drawer opens on that task.
4. Click "Inspect this task →" on an active task → drawer shows the "in progress" placeholder.
5. `/week` → scroll the week timeline; hover a segment → right column highlights the matching task.
6. `/aggregate` → click "Last 7d" → KPIs and bars update. Click Export CSV → file downloads.
7. `/web` → if you have aw-watcher-web installed, see domains render. If not, verify the install-extension empty state appears.
8. `/report?from=2026-04-12&to=2026-04-18` → printable report renders without nav chrome. Click Print.
9. Refresh on any tab — the URL is preserved.

- [ ] **Step 4: Commit**

```bash
git add README.md app/CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for Direction D rebuild"
```

---

## Phase 7 exit checklist

- [ ] `npm run build` passes.
- [ ] `npm run test:run` passes with all lib + store + features tests.
- [ ] `src/components/` and `src/test/components/` directories no longer exist.
- [ ] `@dnd-kit` deps removed from `package.json`.
- [ ] Manual QA above passes.
- [ ] Commit log for this phase contains 8 commits.

**Project exit** (after this phase):
- [ ] All seven phase plans executed.
- [ ] `git log --oneline | head -50` shows a clean sequence of commits from Phase 1 through 7.
- [ ] The app at `http://localhost:5173` matches Direction D of the Redesign-3 mockup for all four tabs.
