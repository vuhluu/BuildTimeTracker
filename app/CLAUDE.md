# BuildTimeTracker — Claude Code Instructions

## Project
Personal task time tracker with ActivityWatch integration. React 18 + TypeScript + Vite 5 + Tailwind CSS 3 (dark theme). Lives in `app/`.

## Prerequisites
- **Node.js** 20+
- **ActivityWatch** must be installed and running on `localhost:5600`. Download from https://activitywatch.net/downloads/ — install the `.dmg` (macOS), run it from Applications, and confirm the tray icon appears. Verify with: `curl -sL http://localhost:5600/api/0/buckets/` (should return JSON with `aw-watcher-window_*` and `aw-watcher-afk_*` buckets).

## Commands
- `npm run dev` — start dev server (http://localhost:5173)
- `npm run build` — type-check + production build
- `npm run test:run` — run all tests once
- `npm test` — watch mode
- Single test file: `npm run test:run -- src/test/path/to/file.test.tsx`

## Architecture
- **State:** zustand + persist middleware → localStorage key `buildtimetracker:v1`. Single store at `src/store/useStore.ts`. All actions are async-safe (startTask auto-stops previous).
- **AW integration:** All calls go through Vite dev proxy `/aw → http://localhost:5600`. Client at `src/lib/activitywatch.ts`. Events are clamped to task time ranges in `src/lib/aggregation.ts`.
- **Charts:** Custom SVG + Tailwind. No chart library. Timeline is in `src/components/Timeline.tsx`.
- **Drag-and-drop:** @dnd-kit/core + @dnd-kit/sortable. Listeners attached to full row (not just handle). Custom app order persisted per session in `TaskSession.appOrder`.
- **Dark theme:** `<html class="dark">`, Tailwind `darkMode: 'class'`. All colors use neutral-* scale with emerald accents.

## Testing
- Vitest 3 + @testing-library/react + jsdom 25
- Test setup: `src/test/setup.ts` — stubs localStorage, uses vi.clearAllMocks() (NOT restoreAllMocks)
- AW client is mocked via vi.mock in component tests
- dnd-kit keyboard testing: focus row by data-testid, Space to pick up, Arrow to move, Space to drop
- jsdom lacks URL.createObjectURL — assign directly in tests, don't use vi.spyOn

## Conventions
- Tailwind for all styling, no CSS modules or styled-components
- No chart libraries — SVG built by hand
- Pure logic lives in `src/lib/`, components in `src/components/`
- Types in `src/types.ts`, not co-located
- zustand selectors: never return new arrays/objects inline (causes infinite re-renders with v5). Select raw store slices, derive with useMemo.
- Component files export named functions (not default), except App.tsx

## Key files to know
- `src/store/useStore.ts` — the central store, all mutations
- `src/lib/aggregation.ts` — event clamping and app grouping (most complex pure logic)
- `src/lib/timeline.ts` — context switch counting and interruption detection
- `src/components/AppBreakdown.tsx` — dnd-kit integration, most complex component
- `vite.config.ts` — dev proxy config + vitest config
- `src/test/setup.ts` — global test setup (localStorage stub, cleanup)
