import type { TaskSession } from '../../types';
import { toSegments } from '../../lib/segments';
import { appColor } from '../../lib/colors';

export type FilmStripProps = {
  sessions: TaskSession[];
  nowMs: number;
  onSelect: (id: string) => void;
};

const HOUR_START = 6;
const HOUR_END = 23;
const RANGE_MS = (HOUR_END - HOUR_START) * 3600 * 1000;

function startOfDayMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(HOUR_START, 0, 0, 0);
  return d.getTime();
}

export function FilmStrip({ sessions, nowMs, onSelect }: FilmStripProps) {
  const dayFrom = startOfDayMs(nowMs);
  return (
    <div className="mb-6">
      <div className="text-[10px] tracking-[0.14em] uppercase text-muted mb-2 flex items-center justify-between">
        <span>Day at a glance</span>
        <span className="font-mono text-[10px] text-muted-2">
          {HOUR_START}a – {HOUR_END > 12 ? `${HOUR_END - 12}p` : `${HOUR_END}a`}
        </span>
      </div>
      <div className="relative h-6 rounded bg-bg-1 border border-line overflow-hidden">
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted">
            Nothing tracked yet
          </div>
        )}
        {sessions.flatMap((s) =>
          toSegments(s.events).map((seg, i) => {
            const l = Math.max(0, ((seg.start - dayFrom) / RANGE_MS) * 100);
            const w = Math.min(100 - l, ((seg.end - seg.start) / RANGE_MS) * 100);
            if (w <= 0 || l >= 100) return null;
            return (
              <button
                key={`${s.id}:${i}`}
                data-filmstrip-seg
                onClick={() => onSelect(s.id)}
                title={`${s.name} · ${seg.app}`}
                className="absolute top-0 bottom-0 hover:brightness-125 transition-[filter]"
                style={{
                  left: `${l}%`,
                  width: `${Math.max(0.3, w)}%`,
                  background: appColor(seg.app),
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
