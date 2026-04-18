import type { AppRollup } from '../../lib/aggregate-range';
import { appColor } from '../../lib/colors';
import { formatDurationShort } from '../../lib/time';

export type TopAppsListProps = {
  apps: AppRollup[];
  showDeltas: boolean;
  limit?: number;
};

export function TopAppsList({ apps, showDeltas, limit = 6 }: TopAppsListProps) {
  const slice = apps.slice(0, limit);
  const max = slice[0]?.seconds ?? 1;

  if (slice.length === 0) {
    return (
      <div className="text-sm text-muted py-6 text-center">No app activity.</div>
    );
  }

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-3">
      {slice.map((a) => {
        const pct = (a.seconds / max) * 100;
        const delta = a.deltaPct;
        const color = appColor(a.app);
        return (
          <li key={a.app}>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: color }}
                aria-hidden
              />
              <span className="text-sm text-ink-2 truncate flex-1">{a.app}</span>
              <span className="font-mono text-sm text-ink tabular-nums">
                {formatDurationShort(a.seconds)}
              </span>
            </div>
            <div className="h-1.5 rounded-sm bg-bg-1 overflow-hidden ml-4">
              <div className="h-full" style={{ width: `${pct}%`, background: color }} />
            </div>
            {showDeltas && delta != null && (
              <div className="mt-1 ml-4 text-[11px] font-mono">
                <DeltaBadge pct={delta} />
                <span className="text-muted ml-1.5">
                  vs {formatDurationShort(a.priorSeconds ?? 0)} last period
                </span>
              </div>
            )}
            {showDeltas && delta == null && a.priorSeconds == null && (
              <div className="mt-1 ml-4 text-[11px] font-mono text-muted-2">new</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DeltaBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0;
  return (
    <span className={isUp ? 'text-good' : 'text-bad'}>
      {isUp ? '▲' : '▼'}
      {Math.abs(Math.round(pct * 100))}%
    </span>
  );
}
