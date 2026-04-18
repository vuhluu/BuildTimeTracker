import type { TaskDayCell, TaskDayMatrix } from '../../lib/aggregate-range';
import { formatDurationShort } from '../../lib/time';

export type TaskDayHeatmapProps = {
  matrix: TaskDayMatrix;
};

function cellTooltip(taskName: string, dayKey: string, cell: TaskDayCell): string {
  if (cell.seconds <= 0) return '';
  const dt = new Date(dayKey + 'T00:00:00');
  const when = dt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const dur = formatDurationShort(cell.seconds);
  const sessions = `${cell.sessionCount} session${cell.sessionCount === 1 ? '' : 's'}`;
  const top =
    cell.topApp != null && cell.topAppPct > 0
      ? ` · top app ${cell.topApp} (${cell.topAppPct.toFixed(0)}%)`
      : '';
  return `${taskName} · ${when}\n${dur} · ${sessions}${top}`;
}

export function TaskDayHeatmap({ matrix }: TaskDayHeatmapProps) {
  const { days, rows, dayTotals, grandTotal } = matrix;
  if (rows.length === 0) {
    return (
      <div className="text-sm text-muted py-8 text-center">
        No task activity in this range.
      </div>
    );
  }

  let maxCell = 0;
  for (const r of rows) for (const d of days) maxCell = Math.max(maxCell, r.perDay[d]?.seconds ?? 0);

  function cellBg(sec: number): string {
    if (sec <= 0 || maxCell === 0) return 'transparent';
    const t = sec / maxCell;
    const alpha = 0.1 + t * 0.8;
    return `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-[10px] tracking-[0.14em] uppercase text-muted">
            <th className="text-left font-medium px-3 py-2 border-b border-line">Task</th>
            {days.map((d) => {
              const dt = new Date(d + 'T00:00:00');
              return (
                <th
                  key={d}
                  className="font-medium px-2 py-2 border-b border-line text-center"
                >
                  <div>{dt.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-muted-2 text-[9px] font-normal">
                    {dt.getMonth() + 1}/{dt.getDate()}
                  </div>
                </th>
              );
            })}
            <th className="text-right font-medium px-3 py-2 border-b border-line">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="px-3 py-1.5 text-ink-2 whitespace-nowrap">{r.name}</td>
              {days.map((d) => {
                const cell = r.perDay[d];
                const sec = cell?.seconds ?? 0;
                return (
                  <td
                    key={d}
                    className="text-center px-2 py-1.5 font-mono text-[11px]"
                    style={{ background: cellBg(sec) }}
                    title={cell ? cellTooltip(r.name, d, cell) : undefined}
                  >
                    {sec > 0 ? (
                      <span className="text-ink">{Math.round(sec / 60)}m</span>
                    ) : (
                      <span className="text-muted-2">·</span>
                    )}
                  </td>
                );
              })}
              <td className="text-right px-3 py-1.5 font-mono text-ink-2">
                {formatDurationShort(r.total)}
              </td>
            </tr>
          ))}
          <tr className="text-muted text-[11px] border-t border-line">
            <td className="px-3 py-2 uppercase tracking-[0.14em] text-[10px]">Daily total</td>
            {days.map((d) => (
              <td key={d} className="text-center px-2 py-2 font-mono">
                {dayTotals[d] > 0 ? formatDurationShort(dayTotals[d]) : '·'}
              </td>
            ))}
            <td className="text-right px-3 py-2 font-mono text-ink">
              {formatDurationShort(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
