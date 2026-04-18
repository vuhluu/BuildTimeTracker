import { useEffect, useMemo, useState } from 'react';
import { findWebBucket, fetchWebEvents } from '../../lib/activitywatch';
import { eventsToVisits, groupByDomain } from '../../lib/web';
import { formatDurationShort } from '../../lib/time';
import { downloadCsv, toCsv } from '../../lib/csv';
import { domainCategory } from '../../lib/web-categories';
import { DomainsView } from './DomainsView';
import { CategoriesView } from './CategoriesView';
import { TimelineVisitsView } from './TimelineVisitsView';
import type { WebEvent, WebVisit } from '../../types';

type Preset = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
type Group = 'domain' | 'category' | 'timeline';

const DAY_MS = 24 * 60 * 60 * 1000;

function presetRange(p: Preset, now: Date): { from: string; to: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  switch (p) {
    case 'today':
      return { from: iso(t), to: iso(t) };
    case 'yesterday': {
      const y = new Date(t.getTime() - DAY_MS);
      return { from: iso(y), to: iso(y) };
    }
    case '7d':
      return { from: iso(new Date(t.getTime() - 6 * DAY_MS)), to: iso(t) };
    case '30d':
      return { from: iso(new Date(t.getTime() - 29 * DAY_MS)), to: iso(t) };
    case 'custom':
      return { from: iso(t), to: iso(t) };
  }
}

export function WebPage() {
  const [preset, setPreset] = useState<Preset>('7d');
  const initial = presetRange('7d', new Date(Date.now()));
  const [fromIso, setFromIso] = useState(initial.from);
  const [toIso, setToIso] = useState(initial.to);
  const [group, setGroup] = useState<Group>('domain');

  const [bucketId, setBucketId] = useState<string | null | undefined>(undefined);
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    findWebBucket()
      .then((id) => setBucketId(id))
      .catch(() => setBucketId(null));
  }, []);

  useEffect(() => {
    if (!bucketId) return;
    setLoading(true);
    setLoadError(null);
    const start = new Date(`${fromIso}T00:00:00`).toISOString();
    const end = new Date(`${toIso}T23:59:59`).toISOString();
    fetchWebEvents(bucketId, start, end)
      .then(setEvents)
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [bucketId, fromIso, toIso]);

  const visits: WebVisit[] = useMemo(() => eventsToVisits(events), [events]);

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p !== 'custom') {
      const r = presetRange(p, new Date(Date.now()));
      setFromIso(r.from);
      setToIso(r.to);
    }
  }

  function exportCsv() {
    const headers = ['timestamp', 'domain', 'url', 'title', 'duration_seconds', 'category'];
    const rows = visits.map((v) => [
      v.timestamp,
      v.domain,
      v.url,
      v.title ?? '',
      String(v.duration),
      domainCategory(v.domain),
    ]);
    downloadCsv(`web-activity-${fromIso}_to_${toIso}.csv`, toCsv(headers, rows));
  }

  const totalSec = visits.reduce((a, v) => a + v.duration, 0);
  const domains = useMemo(() => groupByDomain(visits), [visits]);
  const uniqueDomains = domains.length;
  const uniqueCats = new Set(visits.map((v) => domainCategory(v.domain))).size;
  const busiest = domains[0]?.domain ?? '—';
  const longest = visits.reduce((a, v) => Math.max(a, v.duration), 0);

  if (bucketId === undefined) {
    return (
      <main className="max-w-[1280px] mx-auto px-7 py-6 text-muted">
        Looking for aw-watcher-web…
      </main>
    );
  }

  if (bucketId === null) {
    return (
      <main className="max-w-[1280px] mx-auto px-7 py-6">
        <header className="mb-4">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Web activity
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            Sites you visited
          </h1>
        </header>
        <div className="rounded-lg border border-line-2 bg-bg-1 px-6 py-8 text-sm text-ink-2">
          No <code>aw-watcher-web</code> bucket found. Install the browser
          extension from the{' '}
          <a
            className="text-accent hover:underline"
            href="https://activitywatch.net/downloads/"
            target="_blank"
            rel="noreferrer"
          >
            ActivityWatch downloads page
          </a>{' '}
          in every browser you want tracked. Once it's running, refresh this
          page.
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-7 py-6">
      <header className="mb-5">
        <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
          Web activity
        </div>
        <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
          Sites you visited
        </h1>
        <div className="text-sm text-ink-2 mt-1">
          From aw-watcher-web · {fromIso} – {toIso} · {uniqueDomains} domains ·{' '}
          {uniqueCats} categories
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
          {(['today', 'yesterday', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={[
                'px-3 py-1.5 text-xs border-r border-line last:border-r-0',
                preset === p
                  ? 'bg-bg-3 text-ink'
                  : 'text-ink-2 hover:bg-bg-2',
              ].join(' ')}
            >
              {p === 'today'
                ? 'Today'
                : p === 'yesterday'
                  ? 'Yesterday'
                  : p === '7d'
                    ? 'Last 7d'
                    : 'Last 30d'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-bg-1 border border-line rounded-lg px-2 py-1.5">
          <input
            type="date"
            value={fromIso}
            onChange={(e) => {
              setPreset('custom');
              setFromIso(e.target.value);
            }}
            aria-label="From date"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
          <span className="text-muted-2">→</span>
          <input
            type="date"
            value={toIso}
            onChange={(e) => {
              setPreset('custom');
              setToIso(e.target.value);
            }}
            aria-label="To date"
            className="bg-transparent border-0 text-xs text-ink-2 outline-none"
          />
        </div>

        <div className="flex bg-bg-1 border border-line rounded-lg overflow-hidden">
          {(['domain', 'category', 'timeline'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={[
                'px-3 py-1.5 text-xs border-r border-line last:border-r-0',
                group === g
                  ? 'bg-bg-3 text-ink'
                  : 'text-ink-2 hover:bg-bg-2',
              ].join(' ')}
            >
              {g === 'domain' ? 'Domain' : g === 'category' ? 'Category' : 'Timeline'}
            </button>
          ))}
        </div>

        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg text-xs text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ⤓ Export CSV
        </button>
        <a
          href={`/report?from=${fromIso}&to=${toIso}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg text-xs text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
        >
          ↗ Full report
        </a>
      </div>

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard label="Total web time" value={formatDurationShort(totalSec)} hint={`${visits.length} visits`} />
        <KpiCard label="Domains" value={String(uniqueDomains)} hint={`${uniqueCats} categories`} />
        <KpiCard label="Busiest" value={busiest} hint="by time on page" />
        <KpiCard
          label="Longest visit"
          value={longest > 0 ? formatDurationShort(longest) : '—'}
          hint="single stretch"
        />
      </div>

      {loading && <div className="text-sm text-muted">Loading…</div>}
      {loadError && (
        <div className="text-sm text-bad mb-3">Failed: {loadError}</div>
      )}

      {group === 'domain' && <DomainsView visits={visits} />}
      {group === 'category' && <CategoriesView visits={visits} />}
      {group === 'timeline' && <TimelineVisitsView visits={visits} />}
    </main>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-bg-1 border border-line rounded-lg px-5 py-4">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted">
        {label}
      </div>
      <div className="font-serif text-2xl text-ink mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}
