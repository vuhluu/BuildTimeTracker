import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatDuration, sameLocalDay } from '../lib/time';
import {
  contextSwitches,
  longestStretch,
} from '../lib/timeline';

export function DailySummary() {
  const sessions = useStore((s) => s.sessions);

  const today = useMemo(
    () => sessions.filter((s) => s.endedAt && sameLocalDay(s.startedAt)),
    [sessions],
  );

  const totalSec = today.reduce((acc, s) => {
    const start = new Date(s.startedAt).getTime();
    const end = new Date(s.endedAt as string).getTime();
    return acc + Math.max(0, (end - start) / 1000);
  }, 0);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-lg font-medium">Daily summary</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total tracked" value={formatDuration(totalSec)} />
        <Stat label="Tasks completed" value={String(today.length)} />
        <Stat
          label="Total context switches"
          value={String(
            today.reduce((acc, s) => acc + contextSwitches(s.events), 0),
          )}
        />
      </div>
      {today.length === 0 ? (
        <p className="text-sm text-neutral-500">No completed tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {today.map((s) => {
            const dur =
              (new Date(s.endedAt as string).getTime() -
                new Date(s.startedAt).getTime()) /
              1000;
            const switches = contextSwitches(s.events);
            const longest = longestStretch(s.events);
            return (
              <li
                key={s.id}
                className="grid grid-cols-2 gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 p-2 sm:grid-cols-4"
              >
                <span className="truncate text-sm font-medium text-neutral-100">
                  {s.name}
                </span>
                <span className="font-mono text-sm tabular-nums text-neutral-300">
                  {formatDuration(dur)}
                </span>
                <span className="text-xs text-neutral-400">
                  {switches} switch{switches === 1 ? '' : 'es'}
                </span>
                <span className="text-xs text-neutral-400">
                  longest:{' '}
                  {longest
                    ? `${longest.app} ${formatDuration(longest.seconds)}`
                    : '—'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl tabular-nums text-neutral-100">
        {value}
      </div>
    </div>
  );
}
