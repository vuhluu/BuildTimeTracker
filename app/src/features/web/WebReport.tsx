import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';
import { eventsToVisits, groupByDomain } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';
import { domainCategory } from '../../lib/web-categories';
import { DomainsView } from './DomainsView';
import { CategoriesView } from './CategoriesView';
import { TimelineVisitsView } from './TimelineVisitsView';
import type { WebEvent, WebVisit } from '../../types';

export function WebReport() {
  const [params] = useSearchParams();
  const fromIso = params.get('from') ?? new Date().toISOString().slice(0, 10);
  const toIso = params.get('to') ?? fromIso;

  const [events, setEvents] = useState<WebEvent[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const bucket = await findWebBucket();
        if (!bucket) {
          setEvents([]);
          return;
        }
        const start = new Date(`${fromIso}T00:00:00`).toISOString();
        const end = new Date(`${toIso}T23:59:59`).toISOString();
        const evts = await fetchWebEvents(bucket, start, end);
        setEvents(evts);
      } catch {
        setEvents([]);
      }
    })();
  }, [fromIso, toIso]);

  const visits: WebVisit[] = useMemo(
    () => (events ? eventsToVisits(events) : []),
    [events],
  );

  const totalSec = visits.reduce((a, v) => a + v.duration, 0);
  const domains = useMemo(() => groupByDomain(visits), [visits]);
  const uniqueCats = new Set(visits.map((v) => domainCategory(v.domain))).size;

  function print() {
    window.print();
  }

  if (events === null) {
    return (
      <main className="max-w-[900px] mx-auto px-10 py-12 bg-bg text-ink">
        <p className="text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="max-w-[900px] mx-auto px-10 py-12 bg-bg text-ink print:bg-white print:text-black print:py-0">
      <style>{`
        @media print {
          html, body { background: white !important; color: black !important; }
          main { background: white !important; color: black !important; }
          .report-no-print { display: none !important; }
          section { page-break-inside: avoid; }
          a { color: black !important; }
          /* Override in-component dark tokens so print reads well on paper */
          [class*="bg-bg"]   { background: white !important; }
          [class*="text-ink"]{ color: black !important; }
          [class*="text-muted"]{ color: #555 !important; }
          [class*="border-line"]{ border-color: #ddd !important; }
        }
      `}</style>

      <header className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Web activity report
          </div>
          <h1 className="font-serif text-4xl mt-1">Web activity</h1>
          <div className="text-sm mt-1 text-ink-2">
            <strong>{fromIso}</strong> – <strong>{toIso}</strong> ·{' '}
            {formatDurationShort(totalSec)} across {domains.length} domains ·{' '}
            {uniqueCats} categories
          </div>
        </div>
        <button
          onClick={print}
          className="report-no-print px-4 py-2 bg-accent text-[#0b0c10] rounded text-sm font-medium hover:bg-accent-2"
        >
          Print
        </button>
      </header>

      <section className="mb-10">
        <h2 className="font-serif text-2xl mb-4">Domains</h2>
        <DomainsView visits={visits} />
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-2xl mb-4">Categories</h2>
        <CategoriesView visits={visits} />
      </section>

      <section>
        <h2 className="font-serif text-2xl mb-4">Timeline</h2>
        <TimelineVisitsView visits={visits} />
      </section>
    </main>
  );
}
