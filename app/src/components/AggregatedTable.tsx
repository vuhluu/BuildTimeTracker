import { useMemo } from 'react';
import { downloadCsv, toCsv } from '../lib/csv';
import { formatDuration } from '../lib/time';
import type { AggregatedRow } from '../lib/aggregate-range';

type Props = {
  rows: AggregatedRow[];
};

export function AggregatedTable({ rows }: Props) {
  const appColumns = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const s of r.breakdown) set.add(s.app);
    return Array.from(set).sort();
  }, [rows]);

  const headers = [
    'Task',
    'Total',
    'Sessions',
    'Avg session',
    ...appColumns.map((a) => `${a} %`),
  ];

  const tableRows = rows.map((r) => {
    const percentByApp = new Map(
      r.breakdown.map((s) => [s.app, s.percent]),
    );
    return [
      r.name,
      formatDuration(r.totalSec),
      String(r.sessionCount),
      formatDuration(r.avgSec),
      ...appColumns.map((a) =>
        percentByApp.has(a)
          ? `${(percentByApp.get(a) as number).toFixed(1)}%`
          : '',
      ),
    ];
  });

  function handleExport() {
    const csv = toCsv(headers, tableRows);
    downloadCsv(
      `buildtimetracker-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">Table</h3>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs text-neutral-200 hover:border-emerald-500 hover:text-emerald-300"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-xs"
          aria-label="Aggregated task table"
        >
          <thead>
            <tr className="text-neutral-400">
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-neutral-800 px-2 py-1 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className="text-neutral-200">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-b border-neutral-900 px-2 py-1"
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
