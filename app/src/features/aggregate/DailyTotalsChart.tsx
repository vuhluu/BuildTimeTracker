import { formatDurationShort } from '../../lib/time';

export type DailyTotalsChartProps = {
  /** Ordered day keys (YYYY-MM-DD) to plot on the x-axis. */
  days: string[];
  /** Seconds per day for the current range, keyed by dayKey. */
  current: Record<string, number>;
  /** Seconds per day for the prior range, keyed by dayKey. Must be in the
   *  same order as `days` when read left-to-right. Pass `null` to hide. */
  prior: number[] | null;
  /** Highlight this dayKey (e.g. today) with the accent color. */
  todayKey?: string;
};

const W = 600;
const H = 220;
const PAD = 28;
const BAND_GAP = 4;

export function DailyTotalsChart({ days, current, prior, todayKey }: DailyTotalsChartProps) {
  const currentVals = days.map((d) => current[d] ?? 0);
  const priorVals = prior ?? days.map(() => 0);
  const max = Math.max(1, ...currentVals, ...priorVals);

  const bandWidth = (W - PAD * 2) / Math.max(days.length, 1);
  const barWidth = prior ? (bandWidth - BAND_GAP * 3) / 2 : bandWidth - BAND_GAP * 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {days.map((d, i) => {
        const bandX = PAD + i * bandWidth;
        const labelDate = new Date(d + 'T00:00:00');
        const isToday = d === todayKey;
        const dow = labelDate.toLocaleDateString(undefined, { weekday: 'short' });
        const dayNum = `${labelDate.getMonth() + 1}/${labelDate.getDate()}`;

        const curH = (currentVals[i] / max) * (H - PAD * 2);
        const priH = (priorVals[i] / max) * (H - PAD * 2);

        const curX = prior ? bandX + BAND_GAP + barWidth + BAND_GAP : bandX + BAND_GAP;
        const priX = bandX + BAND_GAP;

        return (
          <g key={d}>
            {prior && (
              <rect
                x={priX}
                y={H - PAD - priH}
                width={barWidth}
                height={priH}
                fill="#2d323c"
                rx="2"
              >
                <title>{`Prior · ${formatDurationShort(priorVals[i])}`}</title>
              </rect>
            )}
            <rect
              x={curX}
              y={H - PAD - curH}
              width={barWidth}
              height={curH}
              fill={isToday ? '#fbbf24' : '#eab308'}
              rx="2"
              opacity={currentVals[i] > 0 ? 1 : 0.3}
            >
              <title>{`${dow} ${dayNum} · ${formatDurationShort(currentVals[i])}`}</title>
            </rect>
            <text
              x={bandX + bandWidth / 2}
              y={H - PAD + 14}
              textAnchor="middle"
              fontSize="11"
              fill={isToday ? '#fbbf24' : '#7a818d'}
              fontWeight={isToday ? 600 : 400}
            >
              {isToday ? 'Today' : dow}
            </text>
            <text
              x={bandX + bandWidth / 2}
              y={H - PAD + 26}
              textAnchor="middle"
              fontSize="9"
              fill="#555b66"
            >
              {dayNum}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
