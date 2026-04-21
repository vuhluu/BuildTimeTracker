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

  const display = [...sessions]
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    )
    .map((session, index) => ({ session, index }))
    .reverse();

  return (
    <ol className="list-none p-0 m-0 border-t border-line">
      {display.map(({ session, index }) => (
        <SceneCard
          key={session.id}
          session={session}
          index={index}
          nowMs={nowMs}
          selected={selectedId === session.id}
          onClick={() => onSelect(session.id)}
        />
      ))}
    </ol>
  );
}
