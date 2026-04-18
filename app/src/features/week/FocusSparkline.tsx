export type FocusSparklineProps = {
  values: (number | null)[];
  labels: string[];
  todayIndex?: number;
};

const W = 500;
const H = 60;
const PAD = 10;

export function FocusSparkline({ values, labels, todayIndex }: FocusSparklineProps) {
  const points = values
    .map((v, i) => {
      if (v == null) return null;
      const x = PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - v * (H - PAD * 2);
      return { x, y, v };
    })
    .filter((p): p is { x: number; y: number; v: number } => p !== null);

  if (points.length === 0) return null;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-[60px]"
      >
        <line
          x1={PAD}
          y1={H - PAD - 0.7 * (H - PAD * 2)}
          x2={W - PAD}
          y2={H - PAD - 0.7 * (H - PAD * 2)}
          stroke="#23272f"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill={p.v >= 0.7 ? '#6ee7a7' : p.v >= 0.5 ? '#fbbf24' : '#f87171'}
            stroke="#111318"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex mt-1.5">
        {labels.map((l, i) => (
          <span
            key={i}
            className={[
              'flex-1 text-center text-[11px]',
              i === todayIndex ? 'text-accent' : 'text-muted',
            ].join(' ')}
          >
            {i === todayIndex ? 'Today' : l}
          </span>
        ))}
      </div>
    </div>
  );
}
