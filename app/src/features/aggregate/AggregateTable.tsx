import { useMemo } from 'react';
import { downloadCsv, toCsv } from '../../lib/csv';
import { formatDuration } from '../../lib/time';
import type { AggregatedRow } from '../../lib/aggregate-range';

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

/** Imperative helper used by aggregate-section header buttons. */
export function exportAggregateCsv(
  rows: AggregatedRow[],
  rangeLabel?: string,
): void {
  const { headers, tableRows } = buildCsv(rows);
  const csv = toCsv(headers, tableRows);
  const stamp =
    rangeLabel ?? new Date().toISOString().slice(0, 10);
  downloadCsv(`buildtimetracker-${stamp}.csv`, csv);
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
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs tracking-[0.14em] uppercase text-muted">Table</h3>
        <button
          type="button"
          onClick={() => exportAggregateCsv(rows)}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ⤓ Export CSV
        </button>
      </div>
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
