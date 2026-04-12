import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { formatClock, formatDuration, sameLocalDay } from '../lib/time';
import { AppBreakdown } from './AppBreakdown';

export function TaskList() {
  const sessions = useStore((s) => s.sessions);
  const completedToday = useMemo(
    () =>
      sessions
        .filter((s) => s.endedAt && sameLocalDay(s.startedAt))
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() -
            new Date(a.startedAt).getTime(),
        ),
    [sessions],
  );

  if (completedToday.length === 0) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="mb-2 text-lg font-medium">Completed today</h2>
        <p className="text-sm text-neutral-500">
          Nothing finished yet. Start a task above to begin tracking.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-lg font-medium">Completed today</h2>
      <ul className="space-y-4">
        {completedToday.map((session) => {
          const started = new Date(session.startedAt).getTime();
          const ended = new Date(session.endedAt as string).getTime();
          const duration = Math.max(0, (ended - started) / 1000);
          return (
            <li
              key={session.id}
              className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-base font-medium text-neutral-100">
                  {session.name}
                </span>
                <span className="font-mono text-sm tabular-nums text-neutral-300">
                  {formatDuration(duration)}
                </span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {formatClock(session.startedAt)} →{' '}
                {formatClock(session.endedAt as string)}
              </div>
              <div className="mt-3">
                <AppBreakdown session={session} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
