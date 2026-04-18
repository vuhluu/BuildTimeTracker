import { useEffect, useRef, useState } from 'react';
import type { TaskSession } from '../../types';
import { useStore } from '../../store/useStore';
import { formatDuration, formatClock } from '../../lib/time';

export type ActiveCardProps = {
  activeSession: TaskSession | null;
  onInspect: (id: string) => void;
  recents: string[];
};

export function ActiveCard({ activeSession, onInspect, recents }: ActiveCardProps) {
  if (activeSession) {
    return <RunningCard session={activeSession} onInspect={onInspect} />;
  }
  return <IdleCard recents={recents.slice(0, 5)} />;
}

function IdleCard({ recents }: { recents: string[] }) {
  const [name, setName] = useState('');
  const startTask = useStore((s) => s.startTask);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await startTask(trimmed);
    setName('');
    inputRef.current?.focus();
  }

  return (
    <section className="rounded-lg border border-line-2 bg-bg-2 p-6">
      <div className="text-[11px] tracking-[0.14em] uppercase text-muted mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-2" />
        Not tracking
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="What are you working on?"
          className="flex-1 bg-bg-1 border border-line rounded-lg px-4 py-2.5 text-base text-ink outline-none focus:border-accent placeholder:text-muted"
          autoFocus
        />
        <button
          onClick={submit}
          className="px-4 py-2.5 rounded-lg bg-accent text-[#0b0c10] font-medium hover:bg-accent-2"
          aria-label="Start task"
        >
          Start task
        </button>
      </div>
      {recents.length > 0 && (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <span className="text-xs text-muted">Recent:</span>
          {recents.map((name) => (
            <button
              key={name}
              onClick={() => startTask(name)}
              className="text-xs px-2.5 py-1 rounded-full bg-bg-1 border border-line text-ink-2 hover:border-line-2"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function RunningCard({
  session,
  onInspect,
}: {
  session: TaskSession;
  onInspect: (id: string) => void;
}) {
  const stopActive = useStore((s) => s.stopActive);
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(
    0,
    (Date.now() - new Date(session.startedAt).getTime()) / 1000,
  );

  return (
    <section className="relative rounded-lg border border-line-2 overflow-hidden bg-gradient-to-b from-bg-2 to-bg-1 p-7">
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-accent to-transparent animate-pulse"
        aria-hidden
      />
      <div className="grid grid-cols-[1fr_auto] gap-8 items-center">
        <div>
          <div className="text-[11px] tracking-[0.14em] uppercase text-accent mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgba(251,191,36,0.15)]" />
            In progress
          </div>
          <div className="text-3xl font-semibold tracking-tight">
            {session.name}
          </div>
          <div className="text-muted text-sm mt-1.5">
            Started <strong className="text-ink-2">{formatClock(session.startedAt)}</strong>
          </div>
        </div>
        <div className="text-right">
          <div
            data-testid="active-timer"
            className="font-mono text-5xl font-medium tabular-nums tracking-tight"
          >
            {formatDuration(elapsedSec)}
          </div>
          <div className="flex gap-2 justify-end mt-3.5">
            <button
              onClick={() => onInspect(session.id)}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-ink-2 border border-line-2 hover:text-ink hover:border-muted-2"
              aria-label="Inspect this task"
            >
              Inspect this task →
            </button>
            <button
              onClick={() => stopActive()}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium bg-bad text-[#2a0808] hover:bg-[#fc8c8c]"
              aria-label="Stop"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
