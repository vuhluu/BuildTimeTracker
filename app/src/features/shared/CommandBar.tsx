import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { formatClock } from '../../lib/time';
import { Kbd } from './KeyHint';

type Item = {
  kind: 'View' | 'Task' | 'Active';
  label: string;
  hint?: string;
  action: () => void;
};

export type CommandBarProps = {
  open: boolean;
  onClose: () => void;
  onPickTask: (sessionId: string) => void;
};

export function CommandBar({ open, onClose, onPickTask }: CommandBarProps) {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);

  const items = useMemo<Item[]>(() => {
    const viewItems: Item[] = [
      { kind: 'View', label: 'Open Today',     action: () => { navigate('/today');     onClose(); } },
      { kind: 'View', label: 'Open Week',      action: () => { navigate('/week');      onClose(); } },
      { kind: 'View', label: 'Open Aggregate', action: () => { navigate('/aggregate'); onClose(); } },
      { kind: 'View', label: 'Open Web',       action: () => { navigate('/web');       onClose(); } },
    ];
    const taskItems: Item[] = sessions.map((s) => ({
      kind: s.endedAt ? 'Task' : 'Active',
      label: s.name,
      hint: formatClock(s.startedAt),
      action: () => onPickTask(s.id),
    }));
    return [...viewItems, ...taskItems];
  }, [sessions, navigate, onClose, onPickTask]);

  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => setSel(0), [query]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = filtered[sel];
      if (it) it.action();
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-lg flex items-start justify-center pt-[14vh]"
      onClick={onClose}
    >
      <div
        className="w-[560px] bg-bg-2 border border-line-2 rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          placeholder="Type a command or task name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full px-4 py-4 bg-transparent border-0 outline-0 text-base border-b border-line text-ink placeholder:text-muted"
        />
        <ul className="list-none m-0 p-1.5 max-h-[360px] overflow-y-auto">
          {filtered.map((i, idx) => (
            <li
              key={`${i.kind}:${i.label}:${idx}`}
              className={[
                'flex items-center gap-3 px-3 py-2 rounded text-[13px] cursor-pointer',
                idx === sel ? 'bg-bg-3' : 'hover:bg-bg-3',
              ].join(' ')}
              onMouseEnter={() => setSel(idx)}
              onClick={() => i.action()}
            >
              <span className="text-[10px] uppercase tracking-[0.1em] text-muted font-mono w-[60px] shrink-0">
                {i.kind}
              </span>
              <span className="text-ink">{i.label}</span>
              {i.hint && (
                <span className="ml-auto text-muted text-[11px] font-mono">
                  {i.hint}
                </span>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-muted text-[13px]">No matches</li>
          )}
        </ul>
        <div className="flex gap-4 px-3.5 py-2 border-t border-line text-[11px] text-muted bg-bg-1">
          <span>
            <Kbd>↑↓</Kbd> navigate
          </span>
          <span>
            <Kbd>⏎</Kbd> select
          </span>
          <span>
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
