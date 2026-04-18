import { useEffect, useState, useMemo } from 'react';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';
import { eventsToVisits, groupByCategory, groupByDomain } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';
import type { WebEvent } from '../../types';

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

export type BrowsingSectionProps = {
  rangeStartIso: string;
  rangeEndIso: string;
};

export function BrowsingSection({ rangeStartIso, rangeEndIso }: BrowsingSectionProps) {
  const [events, setEvents] = useState<WebEvent[] | null>(null);
  const [hasBucket, setHasBucket] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bucket = await findWebBucket();
        if (cancelled) return;
        if (!bucket) {
          setHasBucket(false);
          setEvents([]);
          return;
        }
        setHasBucket(true);
        const evts = await fetchWebEvents(bucket, rangeStartIso, rangeEndIso);
        if (!cancelled) setEvents(evts);
      } catch {
        if (!cancelled) {
          setHasBucket(false);
          setEvents([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rangeStartIso, rangeEndIso]);

  const visits = useMemo(() => (events ? eventsToVisits(events) : []), [events]);
  const totalSec = visits.reduce((a, v) => a + v.duration, 0);
  const cats = useMemo(() => groupByCategory(visits), [visits]);
  const domains = useMemo(() => groupByDomain(visits).slice(0, 9), [visits]);
  const maxCat = cats[0]?.seconds ?? 1;
  const maxDom = domains[0]?.seconds ?? 1;

  if (hasBucket === false) {
    return (
      <div className="text-sm text-muted py-6">
        Install the aw-watcher-web browser extension to see where web time went.
      </div>
    );
  }

  if (events === null) {
    return <div className="text-sm text-muted py-6">Loading web activity…</div>;
  }

  if (visits.length === 0) {
    return (
      <div className="text-sm text-muted py-6">No web activity in this range.</div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <h2 className="font-serif text-2xl">Browsing</h2>
        <div className="text-[11px] tracking-[0.14em] uppercase text-muted">
          {formatDurationShort(totalSec)} · {visits.length} visits
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <section className="bg-bg-1 border border-line rounded-lg p-5">
          <h3 className="font-serif text-lg mb-4">By category</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {cats.map((c) => {
              const pct = (c.seconds / maxCat) * 100;
              const totalPct = (c.seconds / totalSec) * 100;
              return (
                <li key={c.category}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CAT_COLOR[c.category] }}
                    />
                    <span className="text-sm text-ink-2 flex-1">{c.category}</span>
                    <span className="font-mono text-sm text-ink">
                      {formatDurationShort(c.seconds)}
                    </span>
                    <span className="font-mono text-xs text-muted w-10 text-right">
                      {totalPct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-sm bg-bg-2 overflow-hidden ml-4">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: CAT_COLOR[c.category] }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-bg-1 border border-line rounded-lg p-5">
          <h3 className="font-serif text-lg mb-4">Top domains</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {domains.map((d) => {
              const pct = (d.seconds / maxDom) * 100;
              const color = CAT_COLOR[cats.find((c) =>
                c.domains.some((x) => x.domain === d.domain),
              )?.category ?? 'Other'];
              return (
                <li key={d.domain}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-sm text-ink-2 truncate flex-1">{d.domain}</span>
                    <span className="font-mono text-sm text-ink">
                      {formatDurationShort(d.seconds)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-sm bg-bg-2 overflow-hidden ml-4">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
