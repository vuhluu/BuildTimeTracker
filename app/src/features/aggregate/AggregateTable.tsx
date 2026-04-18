import { useMemo } from 'react';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatDuration } from '../../lib/time';
import type { AggregatedRow, TaskDayMatrix } from '../../lib/aggregate-range';

function buildCsv(rows: AggregatedRow[]): { headers: string[]; tableRows: string[][] } {
  const set = new Set<string>();
  for (const r of rows) for (const s of r.breakdown) set.add(s.app);
  const appColumns = Array.from(set).sort();
  const headers = [
    'Task',
    'Total',
    'Sessions',
    'Avg session',
    ...appColumns.map((a) => `${a} %`),
  ];
  const tableRows = rows.map((r) => {
    const percentByApp = new Map(r.breakdown.map((s) => [s.app, s.percent] as const));
    return [
      r.name,
      formatDuration(r.totalSec),
      String(r.sessionCount),
      formatDuration(r.avgSec),
      ...appColumns.map((a) => {
        const p = percentByApp.get(a);
        return p == null ? '' : `${p.toFixed(1)}%`;
      }),
    ];
  });
  return { headers, tableRows };
}

/** Export the per-app task summary (rows × apps, % per app). */
export function exportAggregateCsv(
  rows: AggregatedRow[],
  rangeLabel?: string,
): void {
  const { headers, tableRows } = buildCsv(rows);
  const csv = toCsv(headers, tableRows);
  const stamp = rangeLabel ?? new Date().toISOString().slice(0, 10);
  downloadCsv(`buildtimetracker-tasks-${stamp}.csv`, csv);
}

/**
 * Export the task × day heatmap matrix. Each row is a task; columns are the
 * days in the range plus a trailing Total. Day cells are durations formatted
 * as HH:MM:SS; blank when zero.
 */
export function exportHeatmapCsv(
  matrix: TaskDayMatrix,
  rangeLabel?: string,
): void {
  const dayHeaders = matrix.days.map((d) => {
    const dt = new Date(d + 'T00:00:00');
    const dow = dt.toLocaleDateString(undefined, { weekday: 'short' });
    return `${dow} ${dt.getMonth() + 1}/${dt.getDate()}`;
  });
  const headers = ['Task', ...dayHeaders, 'Total'];
  const tableRows = matrix.rows.map((r) => [
    r.name,
    ...matrix.days.map((d) => {
      const sec = r.perDay[d] ?? 0;
      return sec > 0 ? formatDuration(sec) : '';
    }),
    formatDuration(r.total),
  ]);
  // Footer row: daily totals
  tableRows.push([
    'Daily total',
    ...matrix.days.map((d) =>
      matrix.dayTotals[d] > 0 ? formatDuration(matrix.dayTotals[d]) : '',
    ),
    formatDuration(matrix.grandTotal),
  ]);
  const csv = toCsv(headers, tableRows);
  const stamp = rangeLabel ?? new Date().toISOString().slice(0, 10);
  downloadCsv(`buildtimetracker-heatmap-${stamp}.csv`, csv);
}

export type AggregateTableProps = {
  rows: AggregatedRow[];
};

/**
 * Full task × app % table, rendered below the heatmap when users want the
 * raw numbers. Ships its own "Export CSV" button.
 */
export function AggregateTable({ rows }: AggregateTableProps) {
  const { headers, tableRows } = useMemo(() => buildCsv(rows), [rows]);

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-xs"
          aria-label="Aggregated task table"
        >
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-line px-2 py-1.5 font-medium text-muted uppercase tracking-wider text-[10px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className="text-ink-2">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-line/50 px-2 py-1.5 font-mono"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
