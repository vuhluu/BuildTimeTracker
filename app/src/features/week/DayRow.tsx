import type { TaskSession } from '../../types';
import { toSegments } from '../../lib/segments';
import { appColor } from '../../lib/colors';
import { formatDurationShort } from '../../lib/time';
import type { DayEntry } from '../../lib/week';

const HOUR_START = 8;
const HOUR_END = 20;
const RANGE_MS = (HOUR_END - HOUR_START) * 3600 * 1000;

export type DayRowProps = {
  day: DayEntry;
  sessions: TaskSession[];
  nowMs: number;
  isToday: boolean;
  hoveredTaskId: string | null;
  onHover: (id: string | null) => void;
  focusScore: number | null;
  totalSec: number;
};

export function DayRow({
  day,
  sessions,
  isToday,
  hoveredTaskId,
  onHover,
  focusScore,
  totalSec,
}: DayRowProps) {
  const dayFromMs = day.date.getTime() + HOUR_START * 3600 * 1000;

  const segs = sessions.flatMap((s) =>
    toSegments(s.events).map((seg) => ({ ...seg, sessionId: s.id, sessionName: s.name })),
  );

  const focusCls =
    focusScore == null
      ? 'text-muted-2'
      : focusScore >= 0.7
        ? 'text-good'
        : focusScore >= 0.5
          ? 'text-warn'
          : 'text-bad';

  return (
    <div
      className={[
        'grid grid-cols-[80px_1fr_120px] gap-3 items-center py-2',
        isToday ? 'bg-accent/5 -mx-3 px-3 rounded' : '',
      ].join(' ')}
    >
      <div>
        <div
          className={[
            'font-medium text-sm',
            isToday ? 'text-accent' : 'text-ink-2',
          ].join(' ')}
        >
          {isToday ? 'Today' : day.name}
        </div>
        <div className="text-[11px] text-muted">{day.shortDate}</div>
      </div>

      <div className="relative h-6 rounded bg-bg-1 border border-line overflow-hidden">
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">
            No sessions
          </div>
        )}
        {segs.map((seg, i) => {
          const l = Math.max(0, ((seg.start - dayFromMs) / RANGE_MS) * 100);
          const w = Math.min(
            100 - l,
            ((seg.end - seg.start) / RANGE_MS) * 100,
          );
          if (w <= 0 || l >= 100) return null;
          const highlighted = hoveredTaskId === seg.sessionId;
          return (
            <div
              key={i}
              data-seg
              className={[
                'absolute top-0 bottom-0 cursor-pointer transition-[filter]',
                highlighted ? 'brightness-[1.4]' : '',
                hoveredTaskId && !highlighted ? 'brightness-50 saturate-50' : '',
              ].join(' ')}
              style={{
                left: `${l}%`,
                width: `${Math.max(0.4, w)}%`,
                background: appColor(seg.app),
              }}
              title={`${seg.sessionName} · ${seg.app}`}
              onMouseEnter={() => onHover(seg.sessionId)}
              onMouseLeave={() => onHover(null)}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span
          className={[
            'font-mono text-xs font-medium px-2 py-0.5 rounded border',
            focusScore == null
              ? 'border-line text-muted-2'
              : 'border-line-2',
            focusCls,
          ].join(' ')}
        >
          {focusScore != null ? Math.round(focusScore * 100) : '—'}
        </span>
        <span className="font-mono text-xs text-ink-2 w-14 text-right">
          {totalSec > 0 ? formatDurationShort(totalSec) : ''}
        </span>
      </div>
    </div>
  );
}
