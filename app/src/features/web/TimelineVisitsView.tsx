import { useMemo } from 'react';
import type { WebVisit } from '../../types';
import { domainCategory, domainFavicon } from '../../lib/web-categories';
import { formatClock, formatDurationShort } from '../../lib/time';

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

export function TimelineVisitsView({ visits }: { visits: WebVisit[] }) {
  const sorted = useMemo(
    () =>
      [...visits].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [visits],
  );

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-muted">No web visits in this range.</div>
    );
  }

  return (
    <ul className="list-none p-0 m-0">
      {sorted.map((v, i) => {
        const color = CAT_COLOR[domainCategory(v.domain)];
        return (
          <li
            key={`${v.timestamp}-${i}`}
            className="grid grid-cols-[60px_24px_140px_1fr_60px] gap-3 items-center py-1.5 px-2 text-xs hover:bg-bg-1 rounded"
          >
            <span className="font-mono text-muted">{formatClock(v.timestamp)}</span>
            <span
              className="w-5 h-5 rounded inline-flex items-center justify-center text-[10px] font-mono text-[#0b0c10]"
              style={{ background: color }}
            >
              {domainFavicon(v.domain)}
            </span>
            <span className="text-ink-2 font-mono truncate">{v.domain}</span>
            <span className="text-ink truncate" data-testid="visit-title">
              {v.title || v.url}
            </span>
            <span className="text-right font-mono text-muted">
              {formatDurationShort(v.duration)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
