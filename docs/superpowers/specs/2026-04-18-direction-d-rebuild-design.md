# BuildTimeTracker — Direction D Rebuild

**Date:** 2026-04-18
**Status:** Design approved, ready for implementation plan
**Scope:** Full rebuild of the UI layer against Direction D of `app/BuildTimeTracker Redesign-3.html`.

---

## Summary

Replace the current BuildTimeTracker UI with Direction D — a ribbon + slide-in drawer model with four tabs (Today, Week, Aggregate, Web). Rip out everything under `src/components/`, preserve the pure-logic layer (store, AW client, aggregation, timeline), and rebuild the UI as feature-folders under `src/features/`. Add two new concepts not present in the current app: **focus score** and **app/domain categories**. Integrate `aw-watcher-web` for the new Web tab and its printable `/report` companion.

## Locked decisions

| # | Decision |
|---|---|
| Direction | **D** — Ribbon + editor drawer |
| Scope | All 4 tabs: Today / Week / Aggregate / Web |
| Strategy | Rip and replace (keep the pure-logic layer) |
| Focus score | Mock formula, thresholds deep ≥0.75 / mixed ≥0.50 / scattered <0.50 |
| Categories | Expanded default app→category map (~20 apps), no editing UI |
| Drawer actions | Rename + Resume + Stop (no Pause, no Split) |
| Tweaks panel | Skip — ship cozy density + peach accent only |
| Web report | Ship the `/report` printable page |
| JSON I/O | Drop — copy `localStorage` manually if ever needed |
| Task start | Persistent active-card slot, flips idle ↔ running |
| Routing | `react-router-dom@6`, five routes |

## Architecture

### File layout

```
src/
  main.tsx                  — creates router, mounts <App />
  App.tsx                   — <Routes>: /today /week /aggregate /web /report
  types.ts                  — + Category, WebEvent, WebVisit, WebCategory, DomainMeta
  store/useStore.ts         — + categoryOverrides, webBucketId; drop import/export actions
  lib/
    activitywatch.ts        — + findWebBucket(), fetchWebEvents()
    aggregation.ts          — (kept, minor extensions)
    aggregate-range.ts      — (kept)
    timeline.ts             — (kept; reimplemented on top of segments.ts)
    focus.ts          NEW   — focusScore(), dayFocusScore(), moodClass()
    categories.ts     NEW   — APP_CATEGORY map, appCategory()
    web-categories.ts NEW   — DOMAIN_META map, domainCategory(), extractDomain()
    segments.ts       NEW   — toSegments() extracted from mock's helper set
    csv.ts                  — (kept; + exportWebCsv())
    time.ts                 — (kept)
    colors.ts               — (kept)
  features/
    shared/
      TopNav.tsx            — brand + tabs + AW status dot
      CommandBar.tsx        — ⌘K overlay; fuzzy-search tasks + view jumps
      SceneRibbon.tsx       — <ol> of SceneCard
      SceneCard.tsx         — scene item (rail, time, title, mood, mini-strip)
      Drawer.tsx            — slide-in right panel chrome
      SceneDrawer.tsx       — drawer contents (stats, trace, breakdown, events, actions)
      KeyHint.tsx           — bottom-right monospace hint
    today/
      TodayPage.tsx         — owns selectedId + catFilter + cmdOpen
      ActiveCard.tsx        — idle ↔ running slot
      FilmStrip.tsx         — horizontal day-at-a-glance bar above ribbon
      CategoryFilter.tsx    — All / Code / Creative / Comm / Meeting / Browse chips
    week/
      WeekPage.tsx
      DayRow.tsx            — 8am–8pm timeline row with segments
      FocusSparkline.tsx    — 7-day SVG sparkline
      ShippedList.tsx       — right-column "what you shipped"
    aggregate/
      AggregatePage.tsx     — date-range, KPIs, stacked bars
      AggregateTable.tsx    — (port of current)
    web/
      WebPage.tsx
      DomainsView.tsx
      CategoriesView.tsx
      TimelineVisitsView.tsx
      WebReport.tsx         — /report printable variant
```

Every file under the current `src/components/` is deleted. `ImportExport.tsx` goes with no replacement.

### Routing

`react-router-dom@6`. `<App />` wraps `<BrowserRouter>` and defines:

| Path | Renders |
|---|---|
| `/` | redirect to `/today` |
| `/today` | `<TopNav /><TodayPage />` |
| `/week` | `<TopNav /><WeekPage />` |
| `/aggregate` | `<TopNav /><AggregatePage />` |
| `/web` | `<TopNav /><WebPage />` |
| `/report` | `<WebReport />` (no chrome — reads `?from=&to=` from query string) |

### Store changes

The existing store shape is in [`src/store/useStore.ts`](../../../app/src/store/useStore.ts). Current actions: `startTask`, `stopActive`, `setAppOrder`, `refreshBucket`, `importJson`, `exportJson`, `clearError`, `reset`.

**Kept as-is:** `startTask`, `stopActive`, `refreshBucket`, `clearError`, `reset`, and all state fields except `settings` extensions below.

**Removed:**
- `importJson`, `exportJson` — JSON I/O dropped.
- `setAppOrder` — only `AppBreakdown.tsx` consumed it; that component is deleted. Also drop `TaskSession.appOrder` from `types.ts`.

**Added:**
- `renameSession(id: string, name: string): void` — backs the drawer's inline rename. Trims input, no-op on empty strings.
- `categoryOverrides: Record<string, Category>` (state field) — reserved for future editing UI. Read path uses it via `appCategory(app, overrides)`. No write action in v1.
- `webBucketId: string | null` (inside `settings`) — cached result of `findWebBucket()` so the Web tab doesn't re-list buckets on every mount.
- `refreshWebBucket(): Promise<void>` — mirrors `refreshBucket`, populates `settings.webBucketId`.

## Data model

### Types (additions to `types.ts`)

```ts
export type Category = 'code' | 'creative' | 'comm' | 'meeting' | 'browse';

export type WebCategory =
  | 'Code' | 'Docs' | 'Work' | 'Comms' | 'News'
  | 'Social' | 'Entertainment' | 'Shopping' | 'AI' | 'Other';

export type WebEvent = {
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
```

`TaskSession`, `AWEvent`, `AppSlice` are unchanged. `Settings` gains one optional field (`webBucketId: string | null`). Focus score and category are **always derived**, never persisted on the session. This keeps storage small and means tuning the formula later re-computes transparently.

`TaskSession.appOrder` is removed from the type (was only consumed by the deleted `AppBreakdown`).

### Derived-data flow

```
AW window events ──┬── clampEvent ──→ groupByApp ──→ AppSlice[]
                   ├── toSegments ──→ contextSwitches, longestStretch,
                   │                   FilmStrip segs, Scene strip segs
                   └── toSegments + session duration
                          ↓
                      focusScore (per session)
                          ↓
                      dayFocusScore (duration-weighted)

AW web events ──→ extractDomain ──→ WebVisit ──→ group by domain/category/time
```

Store keeps raw events; everything else is derived in `useMemo` at render time. Matches the project's existing pattern and the CLAUDE.md warning about zustand selectors returning inline-derived arrays.

### Pure lib modules (new)

**`lib/segments.ts`** — `toSegments(events): Segment[]`. Merges consecutive same-app events within a 1 s gap. Already implicit in the current `timeline.ts`; consolidated here so `contextSwitches`, `longestStretch`, the ribbon micro-strip, and the drawer event log all consume the same implementation.

**`lib/focus.ts`**
```ts
focusScore(session, nowMs): number | null   // 0..1, null if session < 60s
dayFocusScore(sessions, nowMs): number      // duration-weighted avg
moodClass(score): 'deep' | 'mixed' | 'scattered'
```
Formula (verbatim from the mock):
```
longestRatio = min(1, longestStretchSec / max(60, sessionDurationSec))
switchPenalty = min(1, switches / 8)
score = 0.55 * longestRatio + 0.45 * (1 - switchPenalty)
```
Thresholds: `deep` ≥ 0.75, `mixed` ≥ 0.50, `scattered` < 0.50.

**`lib/categories.ts`**
```ts
APP_CATEGORY: Record<string, Category>
appCategory(app: string, overrides?: Record<string, Category>): Category
```
Default map (case-insensitive match, ~20 entries):

| Category | Apps |
|---|---|
| code | VS Code, Cursor, Xcode, IntelliJ IDEA, iTerm, Terminal, Warp |
| creative | Figma, Notion, Linear, Obsidian |
| comm | Slack, Discord, Mail, Gmail, Messages |
| meeting | Zoom, Google Meet, Microsoft Teams |
| browse | Chrome, Safari, Arc, Firefox (and anything unknown) |

Resolution: `overrides[app.toLowerCase()] ?? APP_CATEGORY[app.toLowerCase()] ?? 'browse'`.

**`lib/web-categories.ts`** — port the mock's `DOMAIN_META` map (~25 domains with category + favicon). Exports `domainCategory(domain)`, `domainFavicon(domain)`, `extractDomain(url)` (strips scheme, `www.`, path, port).

### AW client additions

```ts
findWebBucket(): Promise<string | null>             // returns aw-watcher-web_* id, or null
fetchWebEvents(bucketId, from, to): WebEvent[]      // clamped to range
```
When `findWebBucket` returns null, the Web tab shows an "install aw-watcher-web" empty state rather than erroring.

## Styling

The mock ships as one big `<style>` block with CSS custom properties (`--bg`, `--accent`, `--mono`, `--radius`, etc.) and BEM-ish class names (`d-drawer`, `c-scene`, `wk-row`). The current app is Tailwind (per `app/CLAUDE.md`).

**Strategy:** keep Tailwind as the primary styling tool, but extend `tailwind.config.js` with the mock's colour tokens so Tailwind utilities resolve to the mock's palette. Load the three Google fonts (Inter, JetBrains Mono, Fraunces) via `<link>` tags in `index.html` and configure Tailwind's `fontFamily` to point at them. The body starts in the mock's "cozy density + peach accent" defaults — no class toggles, no CSS vars at runtime.

Complex per-feature styles that Tailwind handles awkwardly (scene-card rails with `::before`, drawer transforms with custom cubic-bezier easing, `@media print` rules for `/report`, SVG sparkline inner paint) live in small co-located CSS modules (e.g. `features/shared/Drawer.module.css`, `features/web/WebReport.module.css`). Everything else is Tailwind classes.

Reject: a wholesale port to custom CSS files. Rejecting it keeps consistency with the existing app convention and avoids a second styling system.

## UI composition

### Shared primitives

**`TopNav`** — brand + 4-tab pills + AW status dot. Uses `useNavigate` + `useLocation` for active-tab highlighting. Dot state derives from the existing store: green when `settings.bucketId != null && settings.lastError == null`, red with `lastError` as tooltip otherwise, grey during the initial `refreshBucket()` resolve.

**`CommandBar`** — full-screen overlay, portal-ed to `document.body`. Items: task-list (fuzzy match on `session.name`), view jumps (Today/Week/Aggregate/Web), "Export CSV" scoped to the current view. Arrow keys navigate, Enter fires, Esc closes. Opened via a top-level `useCommandBar()` hook any view can call.

**`SceneRibbon` + `SceneCard`** — ordered list of sessions. Each card takes `{session, index, selected, onClick}`. Card derives `slices`, `focusScore`, `moodClass` with `useMemo`. `data-scene-id` on each `<li>` so `j`/`k` can scroll into view.

**`Drawer` + `SceneDrawer`** — `Drawer` is the chrome (scrim, transform, `aria-hidden`). `SceneDrawer` is the content: header (kicker + title + focus + close), body (3 mini-stats, attention trace, app breakdown, event log), footer (Rename + Resume or Stop). Rename toggles the title to an `<input>` inline; Enter or blur commits via `store.renameSession(id, name)`.

**`KeyHint`** — fixed bottom-right monospace hint. Visible only when drawer and command bar are both closed.

### Today tab

```
TopNav
  TodayPage (owns selectedId, catFilter, cmdOpen)
    CommandBar (when cmdOpen)
    ┌── dimmed wrapper (when drawer open) ──────┐
    │ DayHeader ("Your day, so far")             │
    │ DayStats (tracked / focus / switches)      │
    │ Toolbar: cmd trigger + CategoryFilter      │
    │ FilmStrip                                  │
    │ ActiveCard                                 │
    │ SceneRibbon                                │
    │ Footer (local-only note)                   │
    └────────────────────────────────────────────┘
    Drawer (scrim + SceneDrawer) when selectedId
    KeyHint
```

`TodayPage` owns `selectedId`, `catFilter`, `cmdOpen` as local state (not in the store). Keyboard handler registered in a `useEffect`: `⌘K` toggles cmd, `Esc` closes (cmd first, then drawer), `j`/`k` advance `selectedId`. Input-focus guard blocks `j`/`k` when an `<input>` or `<textarea>` is focused.

**Category filter semantics:** `catFilter === 'all'` shows every session. Otherwise, a session is shown when **any** of its events belongs to the selected category (matches the mock's `session.events.some(e => appCategory(e.data.app) === catFilter)`). This keeps mixed-category sessions visible from multiple chips.

**ActiveCard — two render branches:**
- `activeSession == null`: text input, "Start task" button, Recent chips (last 5 unique names from completed sessions). Enter in input calls `store.startTask(name)`.
- `activeSession` present: live timer (1 s interval, same pattern as current `TaskTimer`), task name, start time, "Stop" button (calls `store.stopActive()`), "Inspect this task →" button (sets `selectedId = active.id`).

**Live AW events during an active session — not in scope.** The current app fetches events only on `stopActive`. The mock's "Currently in Notion · Releases / v1.4" line implies polling; we won't add that in v1. Instead:
- The active card shows timer + task name + start time. No "Currently in" line.
- Opening the drawer on the active session shows the header, timer, and a placeholder: *"This task is in progress. App breakdown and event log will appear when you stop."* Mini-stats row hidden. Rename + Stop buttons still work.
- `contextSwitches` and the hero focus score count only completed sessions (matches current behavior).

A future "live poll every 10 s" pass is a clean additive change inside `ActiveCard` and `SceneDrawer` — listed under deferred.

### Week tab

```
WeekPage
  WeekHeader ("Week of Apr 13", 3 summary stats)
  wk-layout (grid 1fr 320px)
    left column:
      DayRow × 7   — Mon-Sun, 8am-8pm timeline of coloured segments
      FocusSparkline — 7 points, svg, highlights today
    right column:
      ShippedList — collapsible per-day completed tasks
```

Hovering a task in `ShippedList` highlights that task's segments in the left timeline (and vice versa) via a single `hoveredTaskId` local state. Week boundary is Mon–Sun, `startOfWeek(now)`. The view filters `store.sessions` by date range; no new store concept.

### Aggregate tab

Keeps current feature set (date range picker, task-name filter, stacked bars sorted by total, CSV export) but re-skinned to match the mock (KPI cards at top, `agg-` classes). `AggregateTable` ports almost verbatim from current. **Comparison mode from the mock is deferred** — deferred features list below.

### Web tab

```
WebPage
  WebHeader + date-range picker + group-by toggle (Domain / Category / Timeline)
  4 KPI stats — total time, domains, busiest, longest
  one of: DomainsView / CategoriesView / TimelineVisitsView
  Buttons: "Export CSV", "Full report" (opens /report?from=&to= in new tab)
```

Data fetch: on mount, `findWebBucket()` called once and cached as `webBucketId` in the store. When the range changes, `fetchWebEvents(bucketId, from, to)` → `WebVisit[]` via `extractDomain`. If no bucket (extension not installed), show: *"Install aw-watcher-web in your browser to see this data."* with a link to the download.

### `/report` page

Standalone printable. No `TopNav`, `Drawer`, or `CommandBar`. Reads `?from=&to=` from URL. Same `fetchWebEvents` path. Three sections mirroring the Web-tab content (domains, categories, timeline) with `@media print` rules (A4-friendly, scroll removed, page breaks between categories). "Print" button top-right triggers the browser print dialog.

## Testing

### Pure logic (Vitest, no jsdom)

| File | Coverage |
|---|---|
| `focus.test.ts` | `focusScore` with known segment inputs; `dayFocusScore` weighting; `moodClass` thresholds at 0.49 / 0.50 / 0.74 / 0.75 |
| `segments.test.ts` | `toSegments` merges consecutive same-app events within 1 s gap; splits across gaps |
| `categories.test.ts` | case-insensitive matching, overrides win over defaults, unknown → `browse` |
| `web-categories.test.ts` | `extractDomain` strips scheme/www/path/port; `domainCategory` known vs Other |
| `aggregation.test.ts`, `timeline.test.ts`, `aggregate-range.test.ts` | Existing tests ported; `contextSwitches` + `longestStretch` re-pointed at `toSegments` (assertions unchanged) |

### Components (testing-library, jsdom)

| File | Coverage |
|---|---|
| `ActiveCard.test.tsx` | idle: typing + Enter calls `startTask`; running: Stop calls `stopActive`; Recent chip click calls `startTask(name)` |
| `SceneCard.test.tsx` | renders title/focus/mood; click fires `onClick(session.id)` |
| `SceneDrawer.test.tsx` | Rename inline-edit → Enter commits via `renameSession`; Resume fires `startTask` |
| `CommandBar.test.tsx` | typing filters items; Enter on a task item calls `onPick`; Esc closes |
| `TodayPage.test.tsx` | `⌘K` opens cmd bar; `j`/`k` advance `selectedId`; input-focus guard blocks `j`/`k` |
| `WebPage.test.tsx` | with `findWebBucket` mocked null, shows install-extension empty state; with events, renders a visit row |

**Skipped:** visual snapshots, `FocusSparkline` SVG pixel assertions. High churn, low signal.

### Guardrails carried over

- `vi.clearAllMocks()` in global `afterEach` (never `restoreAllMocks`).
- Direct assign of `URL.createObjectURL` in tests (jsdom 25 lacks it; `vi.spyOn` fails).
- Zustand selectors: select raw slices, derive with `useMemo`.

## Migration

**Data:** existing `buildtimetracker:v1` localStorage keeps working. The rebuild extends the store without changing `TaskSession` or `AWEvent` shapes, so prior data renders in the new UI with no migration step. New fields (`categoryOverrides`, `webBucketId`) default to sensible values via zustand's `persist` merge.

**Dependencies:** `react-router-dom@6` added. `@dnd-kit/core` and `@dnd-kit/sortable` removed (AppBreakdown is gone; drawer's breakdown list is statically sorted, no reordering).

## Out of scope for v1

- Category editing UI (hook exists via `categoryOverrides`; no write path yet)
- Aggregate "compare range" mode
- Pause, Split session actions
- Tweaks panel (density, accent swap)
- JSON import / export
- Drag-to-reorder app breakdown
- Live AW-event polling during an active session ("Currently in [app]" line + live breakdown in drawer)

These are explicitly deferred — not forgotten. The spec's data model and component boundaries keep them cheap to add later without rework.
