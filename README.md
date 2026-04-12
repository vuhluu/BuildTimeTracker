# BuildTimeTracker

Personal task timer that correlates self-reported tasks with [ActivityWatch](https://activitywatch.net/) window-usage data. A single-page React + Vite app for tracking what you work on and seeing which applications you actually used during each task.

## Quick start

**Prerequisites:**
- **Node.js** 20+
- **ActivityWatch** — download and install from https://activitywatch.net/downloads/. On macOS, open the `.dmg`, drag to Applications, and launch. A tray icon appears when it's running. Verify with:
  ```bash
  curl -sL http://localhost:5600/api/0/buckets/
  ```
  You should see JSON containing `aw-watcher-window_*` and `aw-watcher-afk_*` buckets.

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

### Task Timer
Text input with Start/Stop button. Starting a new task auto-stops the previous one. Press Enter to start. A live elapsed counter updates every second while a task is running.

### Recent Tasks
Displays the last 5 unique task names as clickable chips below the timer. Click any chip to instantly resume that task.

### App Breakdown
Per-task horizontal bars showing application usage pulled from ActivityWatch. Rows are drag-and-drop reorderable -- mouse drag anywhere on the row, or use keyboard (Space to pick up, Arrow keys to move, Space to drop). Custom order persists to localStorage per session.

### Timeline (Gantt)
SVG horizontal bars for each task with colored ActivityWatch event overlays. Includes interruption detection: when you switch away from an app for less than 3 minutes then return, a red hatched overlay marks the interruption.

### Daily Summary
Stats cards showing total tracked time, tasks completed, context switches, and the longest uninterrupted stretch per task.

### Aggregated View
Datetime range picker with task name filter. Shows stacked horizontal bars per task sorted by total time, with session count and average session length.

### CSV Export
Downloads a `.csv` file with task name, duration, session count, average session length, and per-app usage percentages. Also renders as a copyable HTML table in the UI.

### JSON Import/Export
Full state dump and restore for backup and migration between machines.

### Error Handling
Non-fatal banner when ActivityWatch is unreachable. Tasks still save normally with empty event data -- nothing is lost.

## Architecture

| Layer | Tech |
|-------|------|
| UI | React 18, TypeScript, Tailwind CSS 3 (dark theme, class-based) |
| Build | Vite 5 |
| State | zustand with persist middleware |
| Drag-and-drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Custom SVG + Tailwind (no chart library) |
| Tests | Vitest 3 + @testing-library/react + jsdom 25, 31 tests |

**Vite dev proxy:** `/aw` is proxied to `http://localhost:5600`, avoiding CORS issues during development.

**State management:** zustand with persist middleware writes to localStorage key `buildtimetracker:v1`. State restores fully on page load.

## Project structure

```
src/
  types.ts              -- AWEvent, TaskSession, AppSlice, Settings
  store/useStore.ts     -- zustand store with persist, all actions
  lib/
    activitywatch.ts    -- AW API client (listBuckets, findWindowBucket, fetchEvents)
    aggregation.ts      -- clampEvent, groupByApp, applyCustomOrder, mergeBreakdowns
    aggregate-range.ts  -- aggregateSessions for the Aggregate tab
    timeline.ts         -- contextSwitches, longestStretch, detectInterruptions
    csv.ts              -- toCsv, downloadCsv
    time.ts             -- formatDuration, formatClock, sameLocalDay, etc.
    colors.ts           -- stable app->hsl color hash
  components/
    TaskTimer.tsx        -- input + Start/Stop + live elapsed
    RecentTasks.tsx      -- last 5 unique task name chips
    TaskList.tsx         -- today's completed tasks
    AppBreakdown.tsx     -- dnd-kit sortable app bars
    Timeline.tsx         -- SVG Gantt with interruption overlay
    DailySummary.tsx     -- stats cards + per-task summary
    AggregatedView.tsx   -- range picker + stacked bars
    AggregatedTable.tsx  -- HTML table + CSV export button
    ImportExport.tsx     -- JSON dump/load
  App.tsx               -- tab shell (Today / Aggregate) + error banner
```

## Known gotchas

- **Vitest 4 + Node 20.14:** Vitest 4 has a rolldown native-binding bug on Node 20.14. Pinned to Vitest 3.
- **jsdom 29 ESM/CJS interop:** jsdom 29 has an ESM/CJS interop bug. Pinned to jsdom 25. Note that jsdom 25 lacks `URL.createObjectURL` -- tests assign it directly rather than using `vi.spyOn`.
- **`vi.clearAllMocks()` vs `vi.restoreAllMocks()`:** Global `afterEach` must use `vi.clearAllMocks()`, not `vi.restoreAllMocks()`. The latter wipes `vi.fn()` implementations between tests.
- **zustand v5 selector equality:** zustand v5 uses `Object.is` for selector equality. Returning inline derived arrays/objects from selectors causes infinite re-renders. Select raw store slices and derive with `useMemo`.
- **dnd-kit `useSortable` role override:** `useSortable` attributes spread sets `role="button"` on the element, which overrides the implicit `listitem` role.
