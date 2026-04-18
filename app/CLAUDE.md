# BuildTimeTracker — Claude Code Instructions

## Project
Personal task time tracker with ActivityWatch integration. React 18 + TypeScript + Vite 5 + Tailwind CSS 3 (dark theme). Four tabs (Today / Week / Aggregate / Web) driven by react-router-dom. Lives in `app/`.

## Prerequisites
- **Node.js** 20+
- **ActivityWatch** on `localhost:5600`. Download from https://activitywatch.net/downloads/ — install the `.dmg` (macOS), run from Applications. Verify: `curl -sL http://localhost:5600/api/0/buckets/` should return JSON with `aw-watcher-window_*` and `aw-watcher-afk_*` buckets.
- **aw-watcher-web** browser extension (for the Web tab / Aggregate browsing panel) — install per browser from the same downloads page. Real AW client is `aw-client-web`; bucket type is `web.tab.current`. `findWebBucket()` matches on **type**, not client name.

## Commands
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — type-check + production build
- `npm run test:run` — run all tests once
- `npm test` — watch mode
- Single test file: `npm run test:run -- src/test/path/to/file.test.tsx`

## Architecture
- **Routing:** react-router-dom 6. `<App />` wraps `<BrowserRouter>` and renders `<TopNav />` + `<Routes>` for `/today`, `/week`, `/aggregate`, `/web`, `/report` (chromeless printable). `/` redirects to `/today`.
- **State:** zustand + persist middleware → localStorage key `buildtimetracker:v1`. Single store at `src/store/useStore.ts`. Actions: `startTask`, `stopActive`, `renameSession`, `refreshBucket`, `refreshWebBucket`, `clearError`, `reset`. `startTask` auto-stops previous.
- **AW integration:** All calls go through Vite dev proxy `/aw → http://localhost:5600`. Client at `src/lib/activitywatch.ts`. Window events fetched on `stopActive`; web events fetched on WebPage / Aggregate browsing section mount (cached bucket id in `settings.webBucketId`). Not polled during active sessions.
- **Derived data:** focus score / app categories / segments / task×day cells are always derived from raw events at render time, never persisted on sessions.
- **Charts:** Custom SVG + Tailwind. No chart library.
- **Dark theme:** `<html class="dark">`, Tailwind `darkMode: 'class'`. Palette extends Tailwind with `bg/line/ink/muted/accent/cat/web` scales (see `tailwind.config.js`). Fonts: Inter / JetBrains Mono / Fraunces via Google Fonts.
- **Printable `/report`:** same dark theme on screen, switches to white on `@media print` via an inline `<style>` that overrides `bg-*`/`text-*`/`border-*` dark tokens for paper.

## Testing
- Vitest 3 + @testing-library/react + jsdom 25.
- Test setup: `src/test/setup.ts` — stubs localStorage, uses `vi.clearAllMocks()` + `vi.unstubAllGlobals()` in `afterEach` (NOT `restoreAllMocks` globally).
- jsdom lacks `URL.createObjectURL` — assign directly in tests, don't use `vi.spyOn`.
- Store slice tests under `src/test/store/`; pure logic under `src/test/lib/`; components under `src/test/features/<area>/`.
- Date fixtures: tests pin to specific dates (e.g. `dayStart('2026-04-13')`). Helpers in the test file, not a shared fixture — deliberate, so each test is self-contained.

## Conventions
- Tailwind for all styling, no CSS modules or styled-components.
- No chart libraries — SVG built by hand.
- Pure logic lives in `src/lib/`, feature UI under `src/features/<area>/`.
- Types in `src/types.ts`, not co-located.
- zustand selectors: never return new arrays/objects inline (causes infinite re-renders with v5). Select raw store slices, derive with `useMemo`.
- Component files export named functions (not default), except `App.tsx`.
- Mocking "now" in component tests: `vi.spyOn(Date, 'now').mockReturnValue(...)` mocks the primitive but NOT `new Date()` with no args. Components that need a deterministic "now" should read via `new Date(Date.now())`, and helpers (e.g. `presetRange`) should take `now` as a parameter.

## Key files to know
### Pure logic
- `src/store/useStore.ts` — central store, all mutations
- `src/lib/aggregation.ts` — event clamping and app grouping
- `src/lib/segments.ts` — `toSegments()` shared by timeline / film strip / scene strip / drawer event log
- `src/lib/focus.ts` — focus score formula, `moodClass` thresholds (deep ≥ 0.75, mixed ≥ 0.5)
- `src/lib/categories.ts` — app → category mapping with overrides (overrides field reserved, no UI yet)
- `src/lib/web.ts` + `src/lib/web-categories.ts` — web domain taxonomy and aggregation
- `src/lib/aggregate-range.ts` — the Aggregate tab's engine. Exports:
  - `aggregateSessions(sessions, start, end, taskFilter?)` — per-task totals with app breakdown
  - `dailyTotals(sessions, start, end)` — seconds per local day (zero-filled)
  - `taskDayMatrix(sessions, start, end)` — per-task × per-day `TaskDayCell { seconds, sessionCount, topApp, topAppPct }`, pre-computed so heatmap tooltips don't re-iterate
  - `recurringTasks(sessions, start, end, priorStart?, priorEnd?)` — same-name tasks on ≥2 days, with per-day durations for sparkline + vs-prior delta
  - `topAppsInRange(sessions, start, end, priorStart?, priorEnd?)` — app rollup with vs-prior delta
  - `priorRangeOf(start, end)` — same-length window immediately before the current range

### UI
- `src/features/today/TodayPage.tsx` — most complex composed view (drawer + cmd bar + keyboard)
- `src/features/shared/SceneDrawer.tsx` — drawer content with Rename / Resume / Stop
- `src/features/aggregate/AggregatePage.tsx` — presets (This week / Last week / Today / Yesterday / 7d / 30d / Custom), Compare-vs-prior toggle, KPIs, DailyTotalsChart + TopAppsList (two-col), RecurringTasksTable, TaskDayHeatmap, BrowsingSection
- `src/features/aggregate/TaskDayHeatmap.tsx` — peach-scaled heatmap with multi-line native tooltips (task, day, duration, session count, top app %)
- `src/features/aggregate/AggregateTable.tsx` — the task × app %% table **and** two imperative helpers: `exportAggregateCsv(rows)` and `exportHeatmapCsv(matrix)` (separate CSVs for separate data shapes)
- `src/features/aggregate/BrowsingSection.tsx` — fetches aw-watcher-web events for the current range; renders By-category + Top-domains panels
- `src/features/web/WebReport.tsx` — `/report?from=&to=` chromeless printable. Dark on screen, white on `@media print` via inline style overrides of the `bg-*`/`text-*` dark tokens
- `vite.config.ts` — dev proxy config + vitest config
- `src/test/setup.ts` — global test setup

## Design reference
- Live mockup: https://vuhluu.github.io/BuildTimeTracker/design-mockup.html
- Source: `design-mockup.html` at repo root. Shows the shipped Direction D; Tweaks panel exists in source but stays hidden in standalone mode.
