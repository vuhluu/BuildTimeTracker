import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatDuration } from '../lib/time';
import { RecentTasks } from './RecentTasks';

export function TaskTimer() {
  const [name, setName] = useState('');
  const [now, setNow] = useState<number>(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const active = useStore((s) =>
    s.sessions.find((sess) => sess.id === s.activeSessionId) ?? null,
  );
  const startTask = useStore((s) => s.startTask);
  const stopActive = useStore((s) => s.stopActive);

  useEffect(() => {
    if (!activeSessionId) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeSessionId]);

  async function handleStart() {
    if (!name.trim()) return;
    await startTask(name);
    setName('');
    inputRef.current?.focus();
  }

  async function handleStop() {
    await stopActive();
  }

  const elapsedSec = active
    ? Math.max(0, (now - new Date(active.startedAt).getTime()) / 1000)
    : 0;

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStart();
          }}
          placeholder="What are you working on?"
          aria-label="Task name"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-emerald-500"
        />
        <button
          type="button"
          onClick={handleStart}
          disabled={!name.trim()}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          Start
        </button>
        {active && (
          <button
            type="button"
            onClick={handleStop}
            className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
          >
            Stop
          </button>
        )}
      </div>
      {active && (
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-sm text-neutral-400">Tracking</span>
          <span className="text-base font-medium text-neutral-100">
            {active.name}
          </span>
          <span
            aria-label="Elapsed time"
            className="ml-auto font-mono text-2xl tabular-nums text-emerald-400"
          >
            {formatDuration(elapsedSec)}
          </span>
        </div>
      )}
      <RecentTasks
        onPick={async (n) => {
          await startTask(n);
        }}
      />
    </section>
  );
}
