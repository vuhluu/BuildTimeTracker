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

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard label="Total tracked" value={formatDurationShort(totalSec)} />
        <KpiCard label="Sessions" value={String(sessionCount)} />
        <KpiCard label="Tasks" value={String(taskCount)} />
        <KpiCard label="Top task" value={topTask} />
      </div>

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
