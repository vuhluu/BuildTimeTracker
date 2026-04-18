import { useMemo, useState } from 'react';
import type { WebVisit } from '../../types';
import { groupByDomain } from '../../lib/web';
import { domainCategory, domainFavicon } from '../../lib/web-categories';
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

export function DomainsView({ visits }: { visits: WebVisit[] }) {
  const grouped = useMemo(() => groupByDomain(visits), [visits]);
  const [open, setOpen] = useState<string | null>(null);
  const max = grouped[0]?.seconds ?? 1;

  if (grouped.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(120px,auto)_60px_1fr_80px] gap-3 px-3 py-2 text-[10px] tracking-[0.1em] uppercase text-muted border-b border-line">
        <div />
        <div>Domain</div>
        <div>Category</div>
        <div className="text-right">Visits</div>
        <div>Share</div>
        <div className="text-right">Time</div>
      </div>
      {grouped.map((d) => {
        const cat = domainCategory(d.domain);
        const color = CAT_COLOR[cat];
        const pct = (d.seconds / max) * 100;
        const isOpen = open === d.domain;
        return (
          <div key={d.domain}>
            <button
              onClick={() => setOpen(isOpen ? null : d.domain)}
              className="w-full grid grid-cols-[28px_minmax(0,1fr)_minmax(120px,auto)_60px_1fr_80px] gap-3 items-center px-3 py-3 border-b border-line/50 hover:bg-bg-1 text-left"
            >
              <span
                className="w-7 h-7 rounded-md inline-flex items-center justify-center text-[11px] font-mono text-[#0b0c10]"
                style={{ background: color }}
              >
                {domainFavicon(d.domain)}
              </span>
              <div className="min-w-0">
                <div className="text-ink-2 truncate">{d.domain}</div>
                <div className="text-[11px] text-muted">
                  {d.urls.length} page{d.urls.length !== 1 ? 's' : ''} · click to expand
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color }}
                />
                {cat}
              </span>
              <span className="text-right font-mono text-xs text-muted">
                {d.count}
              </span>
              <div className="h-2 rounded-sm bg-bg-1 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span className="text-right font-mono text-xs text-ink-2">
                {formatDurationShort(d.seconds)}
              </span>
            </button>
            {isOpen && (
              <div className="bg-bg-1/50 border-b border-line/50">
                {d.urls.slice(0, 12).map((u) => (
                  <div
                    key={u.url}
                    className="grid grid-cols-[28px_minmax(0,1fr)_60px_80px] gap-3 items-center px-3 py-2 text-[11px]"
                  >
                    <span />
                    <span className="text-ink-2 truncate" title={u.url}>
                      {u.title || u.url}
                    </span>
                    <span className="text-right font-mono text-muted">
                      {u.count}×
                    </span>
                    <span className="text-right font-mono text-ink-2">
                      {formatDurationShort(u.seconds)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
