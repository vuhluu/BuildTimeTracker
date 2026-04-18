# BuildTimeTracker

Personal task timer that correlates self-reported tasks with [ActivityWatch](https://activitywatch.net/) window and web usage data. A single-page React + Vite app with a ribbon + drawer UI across four tabs.

## Design & live demo

The UI is **Direction D** of a four-direction design exploration. The mockup below is a single self-contained HTML file with baked-in mock data — no build step required — and shows the same layout, interactions, and visual system as the app you run locally.

- **👉 Interactive mockup:** https://vuhluu.github.io/BuildTimeTracker/design-mockup.html
- **Source:** [`design-mockup.html`](./design-mockup.html) at the repo root.

## Quick start

**Prerequisites:**
- **Node.js** 20+
- **ActivityWatch** — download from https://activitywatch.net/downloads/. On macOS, open the `.dmg`, drag to Applications, and launch. A tray icon appears when it's running. Verify with:
  ```bash
  curl -sL http://localhost:5600/api/0/buckets/
  ```
  You should see JSON containing `aw-watcher-window_*` and `aw-watcher-afk_*` buckets.
- **aw-watcher-web** (for the Web tab only) — install the browser extension for Chrome/Firefox/Edge/Arc from the ActivityWatch downloads page. The Web tab shows an install-prompt empty state if no `aw-watcher-web_*` bucket is found.

```bash
cd app && npm install && npm run dev
```

Open http://localhost:5173

```bash
npm test            # watch mode
npm run test:run    # run all tests once
npm run build       # type-check + production build
```

## Features

### Today
- **Active card** — idle text input + Recent chips, or running timer + Stop + Inspect.
- **Film strip** — compressed day-wide bar of segments for a glance at the whole day.
- **Scene ribbon** — one card per task with rail, time, title, focus score ("deep" / "mixed" / "scattered"), colored mini-strip, top apps, switches.
- **Drawer** — slides in from the right; full stats (switches, longest, top app), attention trace, app breakdown, event log, Rename and Resume/Stop actions.
- **Command bar** — `⌘K` (or `Ctrl+K`) opens a fuzzy finder for tasks and view jumps.
- **Category filter** — chip row to narrow the ribbon by code / creative / comm / meeting / browse.
- **Keyboard shortcuts** — `j` / `k` navigate the ribbon, `⌘K` opens search, `Esc` closes cmd bar → drawer.

### Week
- **7-day timeline** (8 am – 8 pm) with colored segments per session.
- **Focus sparkline** — 7-point daily focus trend.
- **What you shipped** — per-day list of completed tasks with hover cross-highlight to the timeline.

### Aggregate
- Preset ranges (Today / Yesterday / Last 7d / Last 30d / Custom) + task-name filter.
- 4 KPI cards (Total tracked / Sessions / Tasks / Top task).
- Stacked bars per task + sortable CSV export table.

### Web (requires `aw-watcher-web` browser extension)
- Range picker + group-by toggle (Domain / Category / Timeline).
- KPI stats, per-domain expandable rows with per-URL breakdown, category panels, chronological visit timeline.
- **/report** — standalone printable report tuned for A4.

## Architecture

| Layer | Tech |
|-------|------|
| UI | React 18, TypeScript, Tailwind CSS 3 (dark theme, class-based; Inter / JetBrains Mono / Fraunces) |
| Routing | react-router-dom 6 — URL drives tab state |
| Build | Vite 5 |
| State | zustand with persist middleware |
| Charts | Custom SVG + Tailwind (no chart library) |
| Tests | Vitest 3 + @testing-library/react + jsdom 25, 147 tests |

**Vite dev proxy:** `/aw` is proxied to `http://localhost:5600`, avoiding CORS issues during development.

**State management:** zustand with persist middleware writes to localStorage key `buildtimetracker:v1`. State restores fully on page load.

**Live AW events:** events are fetched on `stopActive`, not polled during an active session. The active card and drawer show a placeholder until the task ends.

## Project structure

```
src/
  types.ts              -- AWEvent, TaskSession, AppSlice, Settings, Category, WebEvent, WebVisit, WebCategory, DomainMeta
  store/useStore.ts     -- zustand store; startTask, stopActive, renameSession, refresh{Bucket,WebBucket}, categoryOverrides
  lib/
    activitywatch.ts    -- listBuckets, findWindowBucket, fetchEvents, findWebBucket, fetchWebEvents
    aggregation.ts      -- clampEvent, groupByApp, applyCustomOrder, mergeBreakdowns
    aggregate-range.ts  -- aggregateSessions for the Aggregate tab
    segments.ts         -- toSegments (shared merge helper)
    timeline.ts         -- contextSwitches, longestStretch, detectInterruptions (uses segments)
    focus.ts            -- focusScore, dayFocusScore, moodClass, sessionDurationSec
    categories.ts       -- APP_CATEGORY defaults + appCategory with overrides
    web-categories.ts   -- DOMAIN_META + extractDomain / domainCategory / domainFavicon
    web.ts              -- eventsToVisits, groupByDomain, groupByCategory
    week.ts             -- startOfWeek, addDays, dayKey, weekDays
    csv.ts              -- toCsv, downloadCsv
    time.ts             -- formatDuration, formatDurationShort, formatClock, sameLocalDay, datetime-local helpers
    colors.ts           -- stable app->hsl color hash
  features/
    shared/
      TopNav.tsx          -- brand, tab links, AW status dot
      CommandBar.tsx      -- ⌘K overlay (tasks + view jumps)
      SceneCard.tsx       -- ribbon item
      SceneRibbon.tsx     -- <ol> of SceneCard
      Drawer.tsx          -- portal-mounted slide-in chrome
      SceneDrawer.tsx     -- drawer content (stats, trace, breakdown, event log, Rename/Resume/Stop)
      KeyHint.tsx         -- bottom-right monospace hint + Kbd helper
    today/
      TodayPage.tsx       -- orchestrates selectedId/catFilter/cmdOpen + keyboard
      ActiveCard.tsx      -- idle ↔ running slot
      FilmStrip.tsx       -- compressed day bar
      CategoryFilter.tsx  -- chip row
    week/
      WeekPage.tsx
      DayRow.tsx          -- 8am-8pm per-day timeline
      FocusSparkline.tsx  -- 7-point SVG
      ShippedList.tsx     -- right-column per-day completed tasks
    aggregate/
      AggregatePage.tsx   -- presets + KPIs + stacked bars
      AggregateTable.tsx  -- CSV export table
    web/
      WebPage.tsx
      DomainsView.tsx
      CategoriesView.tsx
      TimelineVisitsView.tsx
      WebReport.tsx       -- /report printable variant (no chrome)
  App.tsx                 -- <Routes>: /today /week /aggregate /web /report
  main.tsx                -- <BrowserRouter>
```

## Known gotchas

- **Vitest 4 + Node 20.14:** Vitest 4 has a rolldown native-binding bug on Node 20.14. Pinned to Vitest 3.
- **jsdom 29 ESM/CJS interop:** jsdom 29 has an ESM/CJS interop bug. Pinned to jsdom 25. Note that jsdom 25 lacks `URL.createObjectURL` — tests assign it directly rather than using `vi.spyOn`.
- **`vi.clearAllMocks()` vs `vi.restoreAllMocks()`:** Global `afterEach` must use `vi.clearAllMocks()`, not `vi.restoreAllMocks()`. The latter wipes `vi.fn()` implementations between tests.
- **zustand v5 selector equality:** zustand v5 uses `Object.is` for selector equality. Returning inline derived arrays/objects from selectors causes infinite re-renders. Select raw store slices and derive with `useMemo`.
- **Mocking `Date.now` in component tests:** `vi.spyOn(Date, 'now').mockReturnValue(...)` mocks the primitive but not `new Date()` without args. Components that need a deterministic "now" should read via `new Date(Date.now())` or accept `now` as a prop.
