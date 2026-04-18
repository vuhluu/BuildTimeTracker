import { useMemo } from 'react';
import type { WebVisit } from '../../types';
import { groupByCategory } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';

const CAT_COLOR: Record<string, string> = {
  Code: '#7AA2F7',
  Docs: '#38BDF8',
  Work: '#A78BFA',
  Comms: '#F59E0B',
  News: '#E5E7EB',
  Social: '#FB7185',
  Entertainment: '#F472B6',
  Shopping: '#FBBF24',
  AI: '#6EE7A7',
  Other: '#94A3B8',
};

export function CategoriesView({ visits }: { visits: WebVisit[] }) {
  const grouped = useMemo(() => groupByCategory(visits), [visits]);
  const total = grouped.reduce((a, c) => a + c.seconds, 0) || 1;

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {grouped.map((c) => {
        const color = CAT_COLOR[c.category];
        const pct = (c.seconds / total) * 100;
        return (
          <section
            key={c.category}
            className="rounded-lg border p-4"
            style={{
              background: `linear-gradient(135deg, ${color}22, ${color}08)`,
              borderColor: `${color}44`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                />
                <span
                  className="font-serif text-lg"
                  style={{ color }}
                >
                  {c.category}
                </span>
              </div>
              <div className="font-mono text-sm text-ink-2">
                {formatDurationShort(c.seconds)}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-muted mb-3">
              <span>{pct.toFixed(0)}% of web time</span>
              <span>
                {c.domains.length} domain{c.domains.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1">
              {c.domains.slice(0, 8).map((d) => (
                <li
                  key={d.domain}
                  className="flex justify-between text-xs text-ink-2"
                >
                  <span className="truncate">{d.domain}</span>
                  <span className="font-mono text-muted">
                    {formatDurationShort(d.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
