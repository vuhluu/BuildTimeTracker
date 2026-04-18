import type { TaskSession } from '../../types';
import { SceneCard } from './SceneCard';

export type SceneRibbonProps = {
  sessions: TaskSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  nowMs: number;
};

export function SceneRibbon({
  sessions,
  selectedId,
  onSelect,
  nowMs,
}: SceneRibbonProps) {
  if (sessions.length === 0) {
    return (
      <div className="py-16 text-center text-muted">
        No tasks yet. Start one above, and scenes will appear here.
      </div>
    );
  }

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  return (
    <ol className="list-none p-0 m-0 border-t border-line">
      {sorted.map((s, i) => (
        <SceneCard
          key={s.id}
          session={s}
          index={i}
          nowMs={nowMs}
          selected={selectedId === s.id}
          onClick={() => onSelect(s.id)}
        />
      ))}
    </ol>
  );
}
