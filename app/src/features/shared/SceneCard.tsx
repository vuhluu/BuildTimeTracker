import { useMemo } from 'react';
import type { TaskSession } from '../../types';
import { groupByApp } from '../../lib/aggregation';
import { longestStretch } from '../../lib/timeline';
import { toSegments } from '../../lib/segments';
import { focusScore, moodClass, sessionDurationSec } from '../../lib/focus';
import { formatClock, formatDurationShort } from '../../lib/time';
import { appColor } from '../../lib/colors';

export type SceneCardProps = {
  session: TaskSession;
  index: number;
  nowMs: number;
  selected: boolean;
  onClick: () => void;
};

export function SceneCard({
  session,
  index,
  nowMs,
  selected,
  onClick,
}: SceneCardProps) {
  const startIso = session.startedAt;
  const endIso = session.endedAt ?? new Date(nowMs).toISOString();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const durSec = sessionDurationSec(session, nowMs);
  const isActive = !session.endedAt;

  const slices = useMemo(
    () => groupByApp(session.events, startIso, endIso),
    [session.events, startIso, endIso],
  );
  const segments = useMemo(() => toSegments(session.events), [session.events]);
  const score = focusScore(session, nowMs) ?? 0;
  const mood = moodClass(score);
  const topApp = slices[0];
  const longest = longestStretch(session.events);
  const switches = Math.max(0, segments.length - 1);

  const moodColor =
    mood === 'deep' ? 'text-good' : mood === 'mixed' ? 'text-warn' : 'text-bad';

  return (
    <li
      data-scene-id={session.id}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      className={[
        'grid grid-cols-[4px_80px_1fr] gap-4 py-4 px-4 border-b border-line cursor-pointer transition-colors',
        'hover:bg-bg-1/40',
        selected ? 'bg-accent/5 ring-1 ring-accent/30' : '',
        isActive ? 'bg-good/5' : '',
      ].join(' ')}
    >
      <div
        className="w-1 h-full rounded-sm"
        style={{ background: topApp ? appColor(topApp.app) : '#444' }}
      />

      <div className="text-right font-mono text-[11px] text-muted">
        <div className="text-ink-2">{formatClock(session.startedAt)}</div>
        <div className="mt-0.5">{formatDurationShort(durSec)}</div>
        {session.endedAt && (
          <div className="mt-0.5 text-muted-2">
            {formatClock(session.endedAt)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.14em] uppercase text-muted">
              Scene {String(index + 1).padStart(2, '0')}
            </div>
            <h3 className="text-base font-medium mt-0.5 truncate flex items-center gap-2">
              {session.name}
              <span className="text-muted-2 font-mono text-sm">›</span>
            </h3>
          </div>
          <div className="text-center shrink-0">
            <div className={`font-mono text-lg font-semibold ${moodColor}`}>
              {Math.round(score * 100)}
            </div>
            <div className="text-[9px] tracking-[0.14em] uppercase text-muted">
              {mood}
            </div>
          </div>
        </div>

        <div className="relative h-1.5 rounded-sm bg-bg-1 mt-3 overflow-hidden">
          {segments.map((seg, i) => {
            const total = end - start;
            const l = ((seg.start - start) / total) * 100;
            const w = ((seg.end - seg.start) / total) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${l}%`,
                  width: `${w}%`,
                  background: appColor(seg.app),
                }}
                title={`${seg.app}${seg.title ? ` · ${seg.title}` : ''}`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted">
          <div className="flex items-center gap-3 flex-wrap">
            {slices.slice(0, 3).map((s) => (
              <span key={s.app} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ background: appColor(s.app) }}
                />
                <span className="text-ink-2">{s.app}</span>
                <span>{s.percent.toFixed(0)}%</span>
              </span>
            ))}
            {slices.length > 3 && (
              <span className="text-muted-2">+{slices.length - 3} more</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {longest && (
              <span>
                Longest:{' '}
                <strong className="text-ink-2">
                  {formatDurationShort(longest.seconds)}
                </strong>{' '}
                in {longest.app}
              </span>
            )}
            <span className="text-muted-2">·</span>
            <span>{switches} switches</span>
          </div>
        </div>
      </div>
    </li>
  );
}
