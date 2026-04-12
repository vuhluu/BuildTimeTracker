import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  parseDateTimeLocal,
  startOfLocalDay,
  toDateTimeLocalValue,
} from '../lib/time';
import { aggregateSessions, type AggregatedRow } from '../lib/aggregate-range';
import { AggregatedTable } from './AggregatedTable';
import { appColor } from '../lib/colors';
import { formatDuration } from '../lib/time';

export function AggregatedView() {
  const sessions = useStore((s) => s.sessions);
  const [start, setStart] = useState(() =>
    toDateTimeLocalValue(startOfLocalDay()),
  );
  const [end, setEnd] = useState(() => toDateTimeLocalValue(new Date()));
  const [taskFilter, setTaskFilter] = useState('');

  const distinctNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(s.name);
    return Array.from(set).sort();
  }, [sessions]);

  const rows = useMemo(() => {
    const startDate = parseDateTimeLocal(start);
    const endDate = parseDateTimeLocal(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return [];
    }
    return aggregateSessions(
      sessions,
      startDate.toISOString(),
      endDate.toISOString(),
      taskFilter || undefined,
    );
  }, [sessions, start, end, taskFilter]);

  const maxTotal = rows.reduce((acc, r) => Math.max(acc, r.totalSec), 0);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-lg font-medium">Aggregated view</h2>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex flex-col text-xs text-neutral-400">
          From
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-label="Range start"
            className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
          />
        </label>
        <label className="flex flex-col text-xs text-neutral-400">
          To
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-label="Range end"
            className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
          />
        </label>
        <label className="flex flex-col text-xs text-neutral-400">
          Task filter
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            aria-label="Task filter"
            className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
          >
            <option value="">All tasks</option>
            {distinctNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No sessions overlap the selected range.
        </p>
      ) : (
        <>
          <ul
            className="mb-4 space-y-2"
            aria-label="Aggregated task totals"
          >
            {rows.map((row) => (
              <StackedRow
                key={row.name}
                row={row}
                widthPct={
                  maxTotal > 0 ? (row.totalSec / maxTotal) * 100 : 0
                }
              />
            ))}
          </ul>
          <AggregatedTable rows={rows} />
        </>
      )}
    </section>
  );
}

type StackedRowProps = {
  row: AggregatedRow;
  widthPct: number;
};

function StackedRow({ row, widthPct }: StackedRowProps) {
  return (
    <li
      className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] items-center gap-3"
      data-testid={`agg-row-${row.name}`}
    >
      <div className="truncate text-sm text-neutral-200">{row.name}</div>
      <div
        className="h-6 rounded bg-neutral-900"
        role="presentation"
      >
        <div
          className="flex h-full overflow-hidden rounded"
          style={{ width: `${Math.max(2, widthPct)}%` }}
        >
          {row.breakdown.map((slice) => (
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
      <div className="whitespace-nowrap font-mono text-xs tabular-nums text-neutral-300">
        {formatDuration(row.totalSec)} · {row.sessionCount}×
      </div>
    </li>
  );
}
