import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  parseDateTimeLocal,
  startOfLocalDay,
  toDateTimeLocalValue,
  formatDurationShort,
} from '../../lib/time';
import { startOfWeek, addDays, dayKey } from '../../lib/week';
import {
  aggregateSessions,
  dailyTotals,
  daysInRange,
  priorRangeOf,
  recurringTasks,
  taskDayMatrix,
  topAppsInRange,
} from '../../lib/aggregate-range';
import { dayFocusScore, moodClass } from '../../lib/focus';
import {
  AggregateTable,
  exportAggregateCsv,
  exportHeatmapCsv,
} from './AggregateTable';
import { DailyTotalsChart } from './DailyTotalsChart';
import { TopAppsList } from './TopAppsList';
import { DeltaBadge } from './TopAppsList';
import { RecurringTasksTable } from './RecurringTasksTable';
import { TaskDayHeatmap } from './TaskDayHeatmap';
import { BrowsingSection } from './BrowsingSection';

type Preset =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | '7d'
  | '30d'
  | 'custom';

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
    case 'this-week': {
      const mon = startOfWeek(startToday);
      const sun = new Date(addDays(mon, 6).getTime() + DAY_MS - 1);
      return { from: mon, to: sun };
    }
    case 'last-week': {
      const mon = startOfWeek(startToday);
      const lastMon = addDays(mon, -7);
      const lastSun = new Date(addDays(lastMon, 6).getTime() + DAY_MS - 1);
      return { from: lastMon, to: lastSun };
    }
    case '7d':
      return { from: new Date(startToday.getTime() - 6 * DAY_MS), to: endToday };
    case '30d':
      return { from: new Date(startToday.getTime() - 29 * DAY_MS), to: endToday };
    case 'custom':
      return null;
  }
}

export function AggregatePage() {
  const sessions = useStore((s) => s.sessions);

  const [preset, setPreset] = useState<Preset>('this-week');
  const [start, setStart] = useState(() => {
    const r = presetRange('this-week', new Date(Date.now()));
    return toDateTimeLocalValue(r!.from);
  });
  const [end, setEnd] = useState(() => {
    const r = presetRange('this-week', new Date(Date.now()));
    return toDateTimeLocalValue(r!.to);
  });
  const [taskFilter, setTaskFilter] = useState('');
  const [compare, setCompare] = useState(true);

  function applyPreset(p: Preset) {
    setPreset(p);
    const r = presetRange(p, new Date(Date.now()));
    if (r) {
      setStart(toDateTimeLocalValue(r.from));
      setEnd(toDateTimeLocalValue(r.to));
    }
  }

  const startIso = useMemo(() => {
    const d = parseDateTimeLocal(start);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }, [start]);
  const endIso = useMemo(() => {
    const d = parseDateTimeLocal(end);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }, [end]);
  const priorRange = useMemo(
    () => (startIso && endIso ? priorRangeOf(startIso, endIso) : null),
    [startIso, endIso],
  );

  const distinctNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.name);
    return Array.from(set).sort();
  }, [sessions]);

  const rows = useMemo(() => {
    if (!startIso || !endIso) return [];
    return aggregateSessions(sessions, startIso, endIso, taskFilter || undefined);
  }, [sessions, startIso, endIso, taskFilter]);

  const priorRows = useMemo(() => {
    if (!compare || !priorRange) return [];
    return aggregateSessions(
      sessions,
      priorRange.startIso,
      priorRange.endIso,
      taskFilter || undefined,
    );
  }, [compare, priorRange, sessions, taskFilter]);

  const days = useMemo(
    () => (startIso && endIso ? daysInRange(startIso, endIso) : []),
    [startIso, endIso],
  );
  const priorDays = useMemo(
    () =>
      compare && priorRange
        ? daysInRange(priorRange.startIso, priorRange.endIso)
        : [],
    [compare, priorRange],
  );
  const daily = useMemo(
    () => (startIso && endIso ? dailyTotals(sessions, startIso, endIso) : {}),
    [sessions, startIso, endIso],
  );
  const priorDaily = useMemo(() => {
    if (!compare || !priorRange) return null;
    const t = dailyTotals(sessions, priorRange.startIso, priorRange.endIso);
    return priorDays.map((d) => t[d] ?? 0);
  }, [compare, priorRange, priorDays, sessions]);

  const topApps = useMemo(() => {
    if (!startIso || !endIso) return [];
    return topAppsInRange(
      sessions,
      startIso,
      endIso,
      compare && priorRange ? priorRange.startIso : undefined,
      compare && priorRange ? priorRange.endIso : undefined,
    );
  }, [sessions, startIso, endIso, compare, priorRange]);

  const recurring = useMemo(() => {
    if (!startIso || !endIso) return [];
    return recurringTasks(
      sessions,
      startIso,
      endIso,
      compare && priorRange ? priorRange.startIso : undefined,
      compare && priorRange ? priorRange.endIso : undefined,
    );
  }, [sessions, startIso, endIso, compare, priorRange]);

  const matrix = useMemo(
    () =>
      startIso && endIso
        ? taskDayMatrix(sessions, startIso, endIso)
        : { days: [], rows: [], dayTotals: {}, grandTotal: 0 },
    [sessions, startIso, endIso],
  );

  // KPIs
  const nowMs = Date.now();
  const totalSec = rows.reduce((a, r) => a + r.totalSec, 0);
  const priorTotalSec = priorRows.reduce((a, r) => a + r.totalSec, 0);
  const totalDelta =
    compare && priorTotalSec > 0 ? (totalSec - priorTotalSec) / priorTotalSec : null;
  const taskCount = rows.length;

  // Avg focus: duration-weighted over sessions fully inside the range
  const focusScorePct = useMemo(() => {
    if (!startIso || !endIso) return null;
    const rs = new Date(startIso).getTime();
    const re = new Date(endIso).getTime();
    const inRange = sessions.filter((s) => {
      const st = new Date(s.startedAt).getTime();
      return st >= rs && st <= re;
    });
    if (inRange.length === 0) return null;
    return dayFocusScore(inRange, nowMs);
  }, [sessions, startIso, endIso, nowMs]);

  const priorFocusScore = useMemo(() => {
    if (!compare || !priorRange) return null;
    const rs = new Date(priorRange.startIso).getTime();
    const re = new Date(priorRange.endIso).getTime();
    const inRange = sessions.filter((s) => {
      const st = new Date(s.startedAt).getTime();
      return st >= rs && st <= re;
    });
    if (inRange.length === 0) return null;
    return dayFocusScore(inRange, nowMs);
  }, [sessions, compare, priorRange, nowMs]);

  const focusDelta =
    focusScorePct != null && priorFocusScore != null && priorFocusScore > 0
      ? (focusScorePct - priorFocusScore) / priorFocusScore
      : null;

  const topTask = rows[0]?.name ?? '—';
  const topTaskSec = rows[0]?.totalSec ?? 0;
  const topApp = topApps[0]?.app ?? '—';
  const topAppSec = topApps[0]?.seconds ?? 0;

  const todayKey = dayKey(new Date(nowMs));

  // Title shaping
  const isWeekRange = preset === 'this-week' || preset === 'last-week';
  const title =
    preset === 'this-week'
      ? 'This week in review'
      : preset === 'last-week'
        ? 'Last week in review'
        : preset === 'today'
          ? 'Today'
          : preset === 'yesterday'
            ? 'Yesterday'
            : preset === '7d'
              ? 'Last 7 days'
              : preset === '30d'
                ? 'Last 30 days'
                : 'Custom range';

  const rangeLabel = startIso && endIso
    ? `${start.slice(0, 10)} – ${end.slice(0, 10)}`
    : '';

  const subtitle = `${taskCount} tasks · ${formatDurationShort(totalSec)} tracked`;

  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Aggregate · {rangeLabel}
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            {title}
          </h1>
          <p className="text-sm text-ink-2 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isWeekRange && (
            <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
              <button
                onClick={() => applyPreset('this-week')}
                className={`px-3 py-1.5 text-xs ${preset === 'this-week' ? 'text-ink shadow-[inset_0_-2px_0] shadow-accent' : 'text-ink-2 hover:bg-bg-2'}`}
              >
                This week
              </button>
              <button
                onClick={() => applyPreset('last-week')}
                className={`px-3 py-1.5 text-xs border-l border-line ${preset === 'last-week' ? 'text-ink shadow-[inset_0_-2px_0] shadow-accent' : 'text-ink-2 hover:bg-bg-2'}`}
              >
                Last week
              </button>
            </div>
          )}
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-bg-1 text-xs text-ink-2 cursor-pointer">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="accent-accent"
            />
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${compare ? 'bg-accent' : 'bg-muted-2'}`}
              />
              Compare vs prior
            </span>
          </label>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
          {(['this-week', 'last-week', 'today', 'yesterday', '7d', '30d'] as const).map((p) => (
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
              {p === 'this-week'
                ? 'This week'
                : p === 'last-week'
                  ? 'Last week'
                  : p === 'today'
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
              'px-3 py-1.5 text-xs border-l border-line',
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
      <div className="grid grid-cols-4 gap-3.5 mb-10">
        <KpiCard
          label="Total tracked"
          value={formatDurationShort(totalSec)}
          sub={`${taskCount} tasks`}
          delta={totalDelta}
          deltaSub={
            totalDelta != null ? `vs ${formatDurationShort(priorTotalSec)} prior` : undefined
          }
        />
        <KpiCard
          label="Avg focus"
          value={focusScorePct != null ? `${Math.round(focusScorePct * 100)}` : '—'}
          suffix={focusScorePct != null ? '/100' : undefined}
          sub={focusScorePct != null ? moodPhrase(focusScorePct) : undefined}
          delta={focusDelta}
          deltaSub={
            priorFocusScore != null
              ? `vs ${Math.round(priorFocusScore * 100)} prior`
              : undefined
          }
        />
        <KpiCard
          label="Top task"
          value={topTask}
          sub={topTaskSec > 0 ? formatDurationShort(topTaskSec) : undefined}
        />
        <KpiCard
          label="Top app"
          value={topApp}
          sub={topAppSec > 0 ? formatDurationShort(topAppSec) : undefined}
        />
      </div>

      {rows.length === 0 && !compare ? (
        <p className="text-sm text-muted py-8 text-center">
          No sessions overlap the selected range.
        </p>
      ) : (
        <>
          {/* Daily totals + Top apps */}
          <div className="grid grid-cols-[1fr_360px] gap-5 mb-10">
            <section className="bg-bg-1 border border-line rounded-lg p-5">
              <div className="flex items-end justify-between mb-4">
                <h2 className="font-serif text-xl">Daily totals</h2>
                {compare && (
                  <div className="flex gap-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-accent rounded-sm" /> This
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-line-2 rounded-sm" /> Prior
                    </span>
                  </div>
                )}
              </div>
              <DailyTotalsChart
                days={days}
                current={daily}
                prior={priorDaily}
                todayKey={todayKey}
              />
            </section>
            <section className="bg-bg-1 border border-line rounded-lg p-5">
              <div className="flex items-end justify-between mb-4">
                <h2 className="font-serif text-xl">Top apps</h2>
                <div className="text-[10px] tracking-[0.14em] uppercase text-muted">
                  {topApps.length} total
                </div>
              </div>
              <TopAppsList apps={topApps} showDeltas={compare} />
            </section>
          </div>

          {/* Recurring tasks */}
          <section className="mb-10">
            <div className="mb-4">
              <h2 className="font-serif text-2xl">Recurring tasks</h2>
              <p className="text-sm text-muted mt-1">
                Same-name tasks appearing on 2+ days this range. Are you getting
                faster at anything?
              </p>
            </div>
            <RecurringTasksTable rows={recurring} showDeltas={compare} />
          </section>

          {/* Task × day heatmap */}
          <section className="mb-10">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="font-serif text-2xl">Time by task × day</h2>
                <p className="text-sm text-muted mt-1">
                  Minutes per task. Hover a cell for session count and top app.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportHeatmapCsv(matrix)}
                disabled={matrix.rows.length === 0}
                title="Task × day matrix — one column per day"
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⤓ Export day matrix
              </button>
            </div>
            <TaskDayHeatmap matrix={matrix} />
            {rows.length > 0 && (
              <div className="mt-8">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h3 className="text-xs tracking-[0.14em] uppercase text-muted">
                      Task × app breakdown
                    </h3>
                    <p className="text-[11px] text-muted-2 mt-0.5">
                      Per-app share of each task's time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAggregateCsv(rows)}
                    title="Task × app summary — one column per app"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
                  >
                    ⤓ Export app breakdown
                  </button>
                </div>
                <AggregateTable rows={rows} />
              </div>
            )}
          </section>

          {/* Browsing */}
          {startIso && endIso && (
            <section className="mb-10">
              <BrowsingSection rangeStartIso={startIso} rangeEndIso={endIso} />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  sub,
  delta,
  deltaSub,
}: {
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  delta?: number | null;
  deltaSub?: string;
}) {
  return (
    <div className="bg-bg-1 border border-line rounded-lg px-5 py-4">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted">
        {label}
      </div>
      <div className="font-serif text-3xl text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {value}
        {suffix && <span className="text-muted text-lg ml-1">{suffix}</span>}
      </div>
      {sub && <div className="text-[12px] text-ink-2 mt-0.5">{sub}</div>}
      {delta != null && (
        <div className="mt-2 text-[11px] font-mono">
          <DeltaBadge pct={delta} />
          {deltaSub && <span className="text-muted ml-1.5">{deltaSub}</span>}
        </div>
      )}
    </div>
  );
}

function moodPhrase(score: number): string {
  const m = moodClass(score);
  return m === 'deep'
    ? 'Deep period'
    : m === 'mixed'
      ? 'Mixed period'
      : 'Scattered period';
}
