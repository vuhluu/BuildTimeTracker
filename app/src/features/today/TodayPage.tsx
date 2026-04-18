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
import { formatDurationShort, sameLocalDay } from '../../lib/time';
import { dayFocusScore } from '../../lib/focus';
import { appCategory } from '../../lib/categories';
import { contextSwitches } from '../../lib/timeline';
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
