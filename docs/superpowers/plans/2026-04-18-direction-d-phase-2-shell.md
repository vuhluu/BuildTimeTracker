# Direction D Rebuild — Phase 2: Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the router + `TopNav` + empty route shells. After this phase, `npm run dev` renders the app with a navigable four-tab top bar; each tab shows a placeholder page.

**Architecture:** `App.tsx` declares a `<BrowserRouter>` with five routes (`/today`, `/week`, `/aggregate`, `/web`, `/report`) plus a `/` redirect. `TopNav` is visible on every route except `/report`. Placeholder pages are one-line `<div>`s that later phases replace.

**Tech Stack:** react-router-dom@6 (installed in Phase 1), Tailwind (configured in Phase 1), Vitest + @testing-library/react.

**Spec reference:** [docs/superpowers/specs/2026-04-18-direction-d-rebuild-design.md](../specs/2026-04-18-direction-d-rebuild-design.md)

All commands run from `/Users/vuluu/BuildTimeTracker/app/` unless noted.

**Precondition:** Phase 1 merged. `react-router-dom` installed, Tailwind theme extended, `types.ts` + store + lib modules all landed.

---

## Task 2.1: Replace `main.tsx` and `App.tsx` with the router shell

**Files:**
- Modify: `app/src/main.tsx`
- Modify: `app/src/App.tsx`

The current `App.tsx` owns a tabbed layout (Today / Aggregate) and an error banner. We replace it with a router that renders the shell and delegates content to page components.

- [ ] **Step 1: Write the new `main.tsx`**

Replace `app/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

The default-export for `App.tsx` preserves the existing project convention (see `app/CLAUDE.md` — all component files export named functions except `App.tsx`).

Note: we keep `./index.css` because Tailwind's generated utilities flow through it. Phase 1's `index.html` + `tailwind.config.js` point at the same file.

- [ ] **Step 2: Write the new `App.tsx`**

Replace `app/src/App.tsx`:

```tsx
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TopNav } from './features/shared/TopNav';
import { TodayPage } from './features/today/TodayPage';
import { WeekPage } from './features/week/WeekPage';
import { AggregatePage } from './features/aggregate/AggregatePage';
import { WebPage } from './features/web/WebPage';
import { WebReport } from './features/web/WebReport';

export default function App() {
  const location = useLocation();
  const isReport = location.pathname === '/report';

  return (
    <div className="min-h-screen bg-bg text-ink">
      {!isReport && <TopNav />}
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/week" element={<WeekPage />} />
        <Route path="/aggregate" element={<AggregatePage />} />
        <Route path="/web" element={<WebPage />} />
        <Route path="/report" element={<WebReport />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </div>
  );
}
```

- [ ] **Step 3: Verify build fails because the imported pages don't exist yet**

Run:

```bash
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "features/(today|week|aggregate|web|shared)" | head -10
```

Expected: five "Cannot find module" errors — confirms each page import is unresolved. This is intentional; the next tasks create them.

- [ ] **Step 4: Commit**

```bash
git add app/src/main.tsx app/src/App.tsx
git commit -m "feat(shell): router skeleton (five routes, /report chromeless)"
```

---

## Task 2.2: Create `features/shared/TopNav.tsx`

**Files:**
- Create: `app/src/features/shared/TopNav.tsx`
- Create: `app/src/test/features/shared/TopNav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/test/features/shared/TopNav.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopNav } from '../../../features/shared/TopNav';
import { useStore } from '../../../store/useStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopNav />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('TopNav', () => {
  it('renders all four tab labels', () => {
    renderAt('/today');
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Aggregate')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('highlights the active tab for the current route', () => {
    renderAt('/week');
    const active = screen.getByRole('link', { name: 'Week' });
    expect(active).toHaveAttribute('aria-current', 'page');
  });

  it('shows the brand name', () => {
    renderAt('/today');
    expect(screen.getByText('BuildTimeTracker')).toBeInTheDocument();
  });

  it('shows a disconnected status dot when bucketId is null and lastError is null', () => {
    renderAt('/today');
    const dot = screen.getByTestId('aw-status-dot');
    expect(dot).toHaveAttribute('data-state', 'idle');
  });

  it('shows a connected dot when bucketId is set', () => {
    useStore.setState({
      settings: { bucketId: 'b1', webBucketId: null, lastError: null },
    });
    renderAt('/today');
    expect(screen.getByTestId('aw-status-dot')).toHaveAttribute(
      'data-state',
      'connected',
    );
  });

  it('shows an error dot when lastError is set', () => {
    useStore.setState({
      settings: {
        bucketId: null,
        webBucketId: null,
        lastError: 'Cannot reach AW',
      },
    });
    renderAt('/today');
    expect(screen.getByTestId('aw-status-dot')).toHaveAttribute(
      'data-state',
      'error',
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm run test:run -- src/test/features/shared/TopNav.test.tsx
```

Expected: FAIL — `Cannot find module '../../../features/shared/TopNav'`.

- [ ] **Step 3: Implement `TopNav`**

Create `app/src/features/shared/TopNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const TABS = [
  { to: '/today', label: 'Today' },
  { to: '/week', label: 'Week' },
  { to: '/aggregate', label: 'Aggregate' },
  { to: '/web', label: 'Web' },
];

type DotState = 'idle' | 'connected' | 'error';

function awStatus(
  bucketId: string | null,
  lastError: string | null,
): { state: DotState; label: string } {
  if (lastError) return { state: 'error', label: lastError };
  if (bucketId) return { state: 'connected', label: 'ActivityWatch connected' };
  return { state: 'idle', label: 'ActivityWatch not yet checked' };
}

export function TopNav() {
  const bucketId = useStore((s) => s.settings.bucketId);
  const lastError = useStore((s) => s.settings.lastError);
  const status = awStatus(bucketId, lastError);

  return (
    <header className="max-w-[1240px] mx-auto px-8 py-5 flex items-center gap-4 border-b border-line">
      <div className="flex items-center gap-2.5 font-semibold tracking-tight text-[15px]">
        <span
          aria-hidden
          className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-accent to-[#c084fc]"
        />
        <span>BuildTimeTracker</span>
      </div>

      <nav className="flex gap-0.5 p-[3px] bg-bg-1 border border-line rounded-full ml-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              [
                'px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-bg-3 text-ink shadow-[inset_0_0_0_1px_#2d323c]'
                  : 'text-muted hover:text-ink-2',
              ].join(' ')
            }
            end
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted border border-line rounded-full"
          title={status.label}
        >
          <span
            data-testid="aw-status-dot"
            data-state={status.state}
            className={[
              'w-1.5 h-1.5 rounded-full',
              status.state === 'connected'
                ? 'bg-good shadow-[0_0_0_3px_rgba(110,231,167,0.12)]'
                : status.state === 'error'
                  ? 'bg-bad shadow-[0_0_0_3px_rgba(248,113,113,0.12)]'
                  : 'bg-muted-2',
            ].join(' ')}
          />
          <span>
            {status.state === 'connected'
              ? 'ActivityWatch connected'
              : status.state === 'error'
                ? 'ActivityWatch error'
                : 'Not connected'}
          </span>
        </span>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm run test:run -- src/test/features/shared/TopNav.test.tsx
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/shared/TopNav.tsx app/src/test/features/shared/TopNav.test.tsx
git commit -m "feat(shell): TopNav — brand, tab links, AW status dot"
```

---

## Task 2.3: Create placeholder page components

**Files:**
- Create: `app/src/features/today/TodayPage.tsx`
- Create: `app/src/features/week/WeekPage.tsx`
- Create: `app/src/features/aggregate/AggregatePage.tsx`
- Create: `app/src/features/web/WebPage.tsx`
- Create: `app/src/features/web/WebReport.tsx`

Each page is a one-line placeholder so the router compiles. Later phases replace them.

- [ ] **Step 1: Create `features/today/TodayPage.tsx`**

```tsx
export function TodayPage() {
  return (
    <main className="max-w-[980px] mx-auto px-6 py-10" data-testid="page-today">
      <p className="text-muted">Today — placeholder</p>
    </main>
  );
}
```

- [ ] **Step 2: Create `features/week/WeekPage.tsx`**

```tsx
export function WeekPage() {
  return (
    <main className="max-w-[1240px] mx-auto px-7 py-6" data-testid="page-week">
      <p className="text-muted">Week — placeholder</p>
    </main>
  );
}
```

- [ ] **Step 3: Create `features/aggregate/AggregatePage.tsx`**

```tsx
export function AggregatePage() {
  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6" data-testid="page-aggregate">
      <p className="text-muted">Aggregate — placeholder</p>
    </main>
  );
}
```

- [ ] **Step 4: Create `features/web/WebPage.tsx`**

```tsx
export function WebPage() {
  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6" data-testid="page-web">
      <p className="text-muted">Web — placeholder</p>
    </main>
  );
}
```

- [ ] **Step 5: Create `features/web/WebReport.tsx`**

```tsx
export function WebReport() {
  return (
    <main
      className="max-w-[900px] mx-auto px-10 py-12 bg-white text-black print:py-0"
      data-testid="page-report"
    >
      <p>Web Report — placeholder</p>
    </main>
  );
}
```

- [ ] **Step 6: Build to verify the app type-checks and bundles**

Run:

```bash
npm run build
```

Expected: `tsc -b` passes. `vite build` produces a `dist/` folder. No errors.

Known: errors from `src/components/*` still exist because `App.tsx` no longer imports them, but the files still exist and still reference old store actions (e.g. `setAppOrder`). TypeScript type-checks everything in the project, so these will still surface.

Fix: The `tsconfig.app.json` `include` array currently covers everything under `src/`. To keep the build green while we wait to delete the old components in Phase 7, skip the old directories during type-checking for this phase only.

Look at `app/tsconfig.app.json`:

```bash
cat tsconfig.app.json
```

If `include` is `["src"]` (typical), temporarily narrow it by adding `exclude`:

Edit `app/tsconfig.app.json` to include an `exclude` key:

```json
{
  "compilerOptions": {
    "...": "(leave existing options unchanged)"
  },
  "include": ["src"],
  "exclude": [
    "src/components",
    "src/test/components",
    "src/test/setup.ts"
  ]
}
```

Note: **do not remove the existing `compilerOptions` block**. Only add `exclude`. If `exclude` already exists, merge paths in.

Re-run `npm run build` — expected: PASS.

This `exclude` is reverted in Phase 7 once the old components are deleted.

- [ ] **Step 7: Manual smoke test**

Run:

```bash
npm run dev
```

Visit `http://localhost:5173`. Expected:
- Page loads on `/today` (redirect from `/`).
- Top bar shows `BuildTimeTracker` + four pills + status dot.
- Clicking each pill navigates to `/week`, `/aggregate`, `/web`, with the page's placeholder text showing.
- Visiting `/report` directly shows the white-background placeholder with no top bar.
- Browser back/forward work.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add app/src/features app/tsconfig.app.json
git commit -m "feat(shell): placeholder pages for all five routes; temp-exclude old components from tsc"
```

---

## Phase 2 exit checklist

- [ ] `npm run build` passes.
- [ ] `npm run test:run` passes for all tests under `src/test/lib/`, `src/test/store/`, and `src/test/features/`. Component tests under `src/test/components/` are still allowed to fail (cleanup is Phase 7).
- [ ] Manual: visiting each of `/today`, `/week`, `/aggregate`, `/web`, `/report` renders correctly. Navigation works. Status dot reflects store state.
- [ ] Commit log contains 3 commits.

Phase 3 (Shared primitives) picks up here.
