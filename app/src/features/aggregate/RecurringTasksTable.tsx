import type { RecurringTask } from '../../lib/aggregate-range';
import { formatDurationShort } from '../../lib/time';
import { DeltaBadge } from './TopAppsList';

export type RecurringTasksTableProps = {
  rows: RecurringTask[];
  showDeltas: boolean;
};

export function RecurringTasksTable({ rows, showDeltas }: RecurringTasksTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted py-8 text-center">
        No tasks repeated across multiple days in this range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="text-[10px] tracking-[0.14em] uppercase text-muted">
            <th className="border-b border-line px-3 py-2 font-medium">Task</th>
            <th className="border-b border-line px-3 py-2 font-medium text-right">Runs</th>
            <th className="border-b border-line px-3 py-2 font-medium text-right">Total</th>
            <th className="border-b border-line px-3 py-2 font-medium text-right">Avg</th>
            <th className="border-b border-line px-3 py-2 font-medium text-right">Best</th>
            <th className="border-b border-line px-3 py-2 font-medium text-right">Worst</th>
            <th className="border-b border-line px-3 py-2 font-medium">Trend</th>
            {showDeltas && (
              <th className="border-b border-line px-3 py-2 font-medium text-right">
                Vs last
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="text-ink-2">
              <td className="border-b border-line/40 px-3 py-2">
                <div className="text-sm text-ink">{r.name}</div>
                <div className="text-[10px] text-muted">
                  {r.daysActive} days · {r.runs} runs
                </div>
              </td>
              <td className="border-b border-line/40 px-3 py-2 font-mono text-right">{r.runs}</td>
              <td className="border-b border-line/40 px-3 py-2 font-mono text-right">
                {formatDurationShort(r.totalSec)}
              </td>
              <td className="border-b border-line/40 px-3 py-2 font-mono text-right">
                {formatDurationShort(r.avgSec)}
              </td>
              <td className="border-b border-line/40 px-3 py-2 font-mono text-right text-good">
                {formatDurationShort(r.bestSec)}
              </td>
              <td className="border-b border-line/40 px-3 py-2 font-mono text-right text-warn">
                {formatDurationShort(r.worstSec)}
              </td>
              <td className="border-b border-line/40 px-3 py-2">
                <TrendBars values={r.perDaySec} />
              </td>
              {showDeltas && (
                <td className="border-b border-line/40 px-3 py-2 font-mono text-right">
                  {r.deltaPct != null ? (
                    <DeltaBadge pct={r.deltaPct} />
                  ) : r.priorTotalSec == null ? (
                    <span className="text-muted-2">new</span>
                  ) : (
                    <span className="text-muted-2">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-0.5 h-5">
      {values.map((v, i) => {
        const h = (v / max) * 100;
        return (
          <div
            key={i}
            className="w-1 rounded-[1px] bg-accent"
            style={{ height: `${Math.max(4, h)}%`, opacity: v > 0 ? 1 : 0.2 }}
          />
        );
      })}
    </div>
  );
}
