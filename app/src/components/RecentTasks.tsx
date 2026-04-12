import { useMemo } from 'react';
import { useStore } from '../store/useStore';

type Props = {
  onPick: (name: string) => void;
};

export function RecentTasks({ onPick }: Props) {
  const sessions = useStore((s) => s.sessions);
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (let i = sessions.length - 1; i >= 0 && names.length < 5; i--) {
      const n = sessions[i].name;
      if (seen.has(n)) continue;
      seen.add(n);
      names.push(n);
    }
    return names;
  }, [sessions]);

  if (recent.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-neutral-500">
        Recent
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 hover:border-emerald-500 hover:text-emerald-300"
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
