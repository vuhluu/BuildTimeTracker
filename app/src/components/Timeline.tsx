import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { sameLocalDay, formatClock, formatDuration } from '../lib/time';
import { appColor, appColorMuted } from '../lib/colors';
import { detectInterruptions } from '../lib/timeline';
import type { TaskSession } from '../types';

const WIDTH = 900;
const ROW_HEIGHT = 44;
const PAD_LEFT = 72;
const PAD_TOP = 20;
const AXIS_HEIGHT = 16;

export function Timeline() {
  const sessions = useStore((s) => s.sessions);
  const todays = useMemo(
    () =>
      sessions
        .filter((s) => sameLocalDay(s.startedAt))
        .sort(
          (a, b) =>
            new Date(a.startedAt).getTime() -
            new Date(b.startedAt).getTime(),
        ),
    [sessions],
  );

  if (todays.length === 0) {
    return (
      <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h2 className="mb-2 text-lg font-medium">Timeline</h2>
        <p className="text-sm text-neutral-500">
          No tasks yet today.
        </p>
      </section>
    );
  }

  const firstStart = Math.min(
    ...todays.map((t) => new Date(t.startedAt).getTime()),
  );
  const lastEnd = Math.max(
    ...todays.map((t) =>
      new Date(t.endedAt ?? new Date().toISOString()).getTime(),
    ),
  );
  const rangeMs = Math.max(1, lastEnd - firstStart);
  const innerWidth = WIDTH - PAD_LEFT - 16;
  const pxPerMs = innerWidth / rangeMs;
  const height =
    PAD_TOP + AXIS_HEIGHT + todays.length * ROW_HEIGHT + 12;

  const axisTicks = makeTicks(firstStart, lastEnd);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-2 text-lg font-medium">Timeline</h2>
      <div className="overflow-x-auto">
        <svg width={WIDTH} height={height} role="img" aria-label="Daily timeline">
          <defs>
            <pattern
              id="interruption-hatch"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="transparent" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#f87171" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Axis */}
          {axisTicks.map((tick) => {
            const x = PAD_LEFT + (tick - firstStart) * pxPerMs;
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1={PAD_TOP}
                  x2={x}
                  y2={height - 4}
                  stroke="#262626"
                  strokeDasharray="2 4"
                />
                <text
                  x={x}
                  y={PAD_TOP - 6}
                  fontSize="10"
                  fill="#737373"
                  textAnchor="middle"
                >
                  {formatClock(new Date(tick).toISOString())}
                </text>
              </g>
            );
          })}

          {todays.map((session, i) => (
            <TimelineRow
              key={session.id}
              session={session}
              rowIndex={i}
              firstStart={firstStart}
              pxPerMs={pxPerMs}
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

type RowProps = {
  session: TaskSession;
  rowIndex: number;
  firstStart: number;
  pxPerMs: number;
};

function TimelineRow({ session, rowIndex, firstStart, pxPerMs }: RowProps) {
  const y = PAD_TOP + AXIS_HEIGHT + rowIndex * ROW_HEIGHT;
  const start = new Date(session.startedAt).getTime();
  const end = new Date(session.endedAt ?? new Date().toISOString()).getTime();
  const x = PAD_LEFT + (start - firstStart) * pxPerMs;
  const w = Math.max(1, (end - start) * pxPerMs);
  const interruptions = detectInterruptions(session.events);
  const duration = (end - start) / 1000;

  return (
    <g>
      <text
        x={PAD_LEFT - 6}
        y={y + 14}
        fontSize="11"
        fill="#d4d4d4"
        textAnchor="end"
      >
        {truncate(session.name, 12)}
      </text>
      <rect
        x={x}
        y={y}
        width={w}
        height={14}
        rx={3}
        fill={appColorMuted(session.name)}
      >
        <title>
          {session.name} — {formatDuration(duration)} ({formatClock(session.startedAt)} →{' '}
          {formatClock(session.endedAt ?? new Date().toISOString())})
        </title>
      </rect>
      {session.events.map((ev) => {
        const evStart = new Date(ev.timestamp).getTime();
        const evEnd = evStart + ev.duration * 1000;
        const cs = Math.max(evStart, start);
        const ce = Math.min(evEnd, end);
        if (ce <= cs) return null;
        const ex = PAD_LEFT + (cs - firstStart) * pxPerMs;
        const ew = Math.max(1, (ce - cs) * pxPerMs);
        const isInterrupt = interruptions.has(ev.id);
        return (
          <g key={ev.id}>
            <rect
              x={ex}
              y={y + 18}
              width={ew}
              height={10}
              rx={2}
              fill={appColor(ev.data.app)}
            >
              <title>
                {ev.data.app}
                {ev.data.title ? ` — ${ev.data.title}` : ''} — {formatDuration(ev.duration)}
              </title>
            </rect>
            {isInterrupt && (
              <rect
                x={ex}
                y={y + 18}
                width={ew}
                height={10}
                rx={2}
                fill="url(#interruption-hatch)"
                stroke="#f87171"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function makeTicks(startMs: number, endMs: number): number[] {
  const rangeMs = endMs - startMs;
  const steps = 6;
  const step = rangeMs / steps;
  const ticks: number[] = [];
  for (let i = 0; i <= steps; i++) ticks.push(Math.round(startMs + i * step));
  return ticks;
}
