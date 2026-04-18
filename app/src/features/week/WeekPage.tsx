import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { startOfWeek, weekDays, dayKey } from '../../lib/week';
import { sessionDurationSec, dayFocusScore, focusScore } from '../../lib/focus';
import { formatDurationShort } from '../../lib/time';
import { DayRow } from './DayRow';
import { ShippedList } from './ShippedList';
import { FocusSparkline } from './FocusSparkline';
import type { TaskSession } from '../../types';

function sessionsInDay(sessions: TaskSession[], dayKeyVal: string): TaskSession[] {
  return sessions.filter((s) => {
    const d = new Date(s.startedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return key === dayKeyVal;
  });
}

export function WeekPage() {
  const allSessions = useStore((s) => s.sessions);
  const nowMs = Date.now();
  const now = new Date(nowMs);

  const monday = useMemo(() => startOfWeek(now), [nowMs]);
  const days = useMemo(() => weekDays(monday), [monday]);
  const today = dayKey(now);

  const perDay = useMemo(
    () =>
      days.map((d) => {
        const sessions = sessionsInDay(allSessions, d.key);
        const totalSec = sessions.reduce(
          (a, s) => a + sessionDurationSec(s, nowMs),
          0,
        );
        const scores = sessions
          .map((s) => focusScore(s, nowMs))
          .filter((x): x is number => x != null);
        const focus =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;
        const dayScore = dayFocusScore(sessions, nowMs);
        return {
          day: d,
          sessions,
          totalSec,
          focus: focus ?? (sessions.length === 0 ? null : dayScore),
          isToday: d.key === today,
        };
      }),
    [days, allSessions, nowMs, today],
  );

  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const totalTracked = perDay.reduce((a, d) => a + d.totalSec, 0);
  const totalTasks = perDay
    .flatMap((d) => d.sessions)
    .filter((s) => s.endedAt).length;
  const validFocus = perDay.map((d) => d.focus).filter((x): x is number => x != null);
  const avgFocus =
    validFocus.length > 0
      ? Math.round((validFocus.reduce((a, b) => a + b, 0) / validFocus.length) * 100)
      : null;

  const todayIdx = days.findIndex((d) => d.key === today);

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-6">
      <header className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted">
            Week of{' '}
            {monday.toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <h1 className="font-serif text-4xl font-normal tracking-tight mt-1">
            This week
          </h1>
        </div>
        <div className="flex gap-6">
          <SummaryStat label="Total tracked" value={formatDurationShort(totalTracked)} />
          <SummaryStat label="Tasks completed" value={String(totalTasks)} />
          <SummaryStat
            label="Avg focus"
            value={avgFocus != null ? String(avgFocus) : '—'}
            suffix={avgFocus != null ? '/100' : undefined}
          />
        </div>
      </header>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
            Daily timeline · 8 am – 8 pm
          </div>
          <div className="flex flex-col gap-1 mb-8">
            {perDay.map((row) => (
              <DayRow
                key={row.day.key}
                day={row.day}
                sessions={row.sessions}
                nowMs={nowMs}
                isToday={row.isToday}
                hoveredTaskId={hoveredTaskId}
                onHover={setHoveredTaskId}
                focusScore={row.focus}
                totalSec={row.totalSec}
              />
            ))}
          </div>
          <div>
            <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
              Focus trend
            </div>
            <FocusSparkline
              values={perDay.map((d) => d.focus)}
              labels={perDay.map((d) => d.day.name)}
              todayIndex={todayIdx >= 0 ? todayIdx : undefined}
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-3">
            What you shipped
          </div>
          <ShippedList
            days={perDay.map((d) => ({
              day: d.day,
              sessions: d.sessions,
              isToday: d.isToday,
            }))}
            nowMs={nowMs}
            hoveredTaskId={hoveredTaskId}
            onHover={setHoveredTaskId}
          />
        </div>
      </div>
    </main>
  );
}

function SummaryStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-mono text-2xl text-ink">
        {value}
        {suffix && <span className="text-muted text-base ml-1">{suffix}</span>}
      </span>
      <span className="text-[10px] tracking-[0.14em] uppercase text-muted mt-0.5">
        {label}
      </span>
    </div>
  );
}
