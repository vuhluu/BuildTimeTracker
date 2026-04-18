import type { TaskSession } from '../../types';
import type { DayEntry } from '../../lib/week';
import { groupByApp } from '../../lib/aggregation';
import { appColor } from '../../lib/colors';
import { formatDurationShort } from '../../lib/time';
import { sessionDurationSec } from '../../lib/focus';

export type ShippedDay = {
  day: DayEntry;
  sessions: TaskSession[];
  isToday: boolean;
};

export type ShippedListProps = {
  days: ShippedDay[];
  nowMs: number;
  hoveredTaskId: string | null;
  onHover: (id: string | null) => void;
};

export function ShippedList({ days, nowMs, hoveredTaskId, onHover }: ShippedListProps) {
  const hasAny = days.some((d) => d.sessions.some((s) => s.endedAt));
  if (!hasAny) {
    return (
      <div className="text-sm text-muted py-8 text-center">
        Nothing shipped yet this week.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((d) => {
        const completed = d.sessions.filter((s) => s.endedAt);
        if (completed.length === 0) return null;
        return (
          <section key={d.day.key}>
            <header className="flex items-center justify-between mb-2 text-[11px] tracking-[0.1em] uppercase">
              <span className={d.isToday ? 'text-accent' : 'text-muted'}>
                {d.isToday ? 'Today' : `${d.day.name}, ${d.day.shortDate}`}
              </span>
              <span className="text-muted-2">{completed.length} tasks</span>
            </header>
            <ul className="flex flex-col gap-1 list-none p-0 m-0">
              {completed.map((s) => {
                const dur = sessionDurationSec(s, nowMs);
                const top = groupByApp(s.events, s.startedAt, s.endedAt!)[0];
                const highlighted = hoveredTaskId === s.id;
                return (
                  <li
                    key={s.id}
                    className={[
                      'flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
                      highlighted ? 'bg-bg-2' : 'hover:bg-bg-1',
                    ].join(' ')}
                    onMouseEnter={() => onHover(s.id)}
                    onMouseLeave={() => onHover(null)}
                  >
                    <span className="text-good shrink-0" aria-hidden>✓</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-2 truncate">{s.name}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5">
                        <span className="font-mono">{formatDurationShort(dur)}</span>
                        {top && (
                          <>
                            <span className="text-muted-2">·</span>
                            <span style={{ color: appColor(top.app) }}>
                              {top.app}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
