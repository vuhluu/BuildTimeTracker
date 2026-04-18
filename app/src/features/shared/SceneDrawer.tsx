import { useMemo, useState } from 'react';
import type { TaskSession } from '../../types';
import { groupByApp } from '../../lib/aggregation';
import { longestStretch } from '../../lib/timeline';
import { toSegments } from '../../lib/segments';
import {
  focusScore,
  moodClass,
  sessionDurationSec,
} from '../../lib/focus';
import { formatClock, formatDurationShort } from '../../lib/time';
import { appColor } from '../../lib/colors';
import { useStore } from '../../store/useStore';

export type SceneDrawerProps = {
  session: TaskSession;
  nowMs: number;
  onClose: () => void;
};

export function SceneDrawer({ session, nowMs, onClose }: SceneDrawerProps) {
  const isActive = !session.endedAt;
  const startIso = session.startedAt;
  const endIso = session.endedAt ?? new Date(nowMs).toISOString();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const durSec = sessionDurationSec(session, nowMs);

  const slices = useMemo(
    () => groupByApp(session.events, startIso, endIso),
    [session.events, startIso, endIso],
  );
  const segments = useMemo(() => toSegments(session.events), [session.events]);
  const switches = Math.max(0, segments.length - 1);
  const longest = longestStretch(session.events);
  const score = focusScore(session, nowMs) ?? 0;
  const mood = moodClass(score);

  const moodColor =
    mood === 'deep' ? 'text-good' : mood === 'mixed' ? 'text-warn' : 'text-bad';

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(session.name);
  const renameSession = useStore((s) => s.renameSession);
  const startTask = useStore((s) => s.startTask);
  const stopActive = useStore((s) => s.stopActive);

  function commitRename() {
    if (nameDraft.trim() && nameDraft.trim() !== session.name) {
      renameSession(session.id, nameDraft);
    }
    setRenaming(false);
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-start px-6 pt-6 pb-4 border-b border-line">
        <div className="min-w-0">
          <div
            className={[
              'font-mono text-[10px] tracking-[0.14em] uppercase inline-flex items-center gap-2',
              isActive ? 'text-good' : 'text-muted',
            ].join(' ')}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
            )}
            {isActive ? 'In progress' : 'Completed task'}
          </div>
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setNameDraft(session.name);
                  setRenaming(false);
                }
              }}
              className="mt-1 w-full bg-bg-1 border border-line-2 rounded px-2 py-1 text-xl font-semibold text-ink outline-none focus:border-accent"
            />
          ) : (
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {session.name}
            </h2>
          )}
          <div className="mt-1 text-xs text-muted font-mono">
            {formatClock(session.startedAt)} –{' '}
            {session.endedAt ? formatClock(session.endedAt) : 'now'}
            {' · '}
            {formatDurationShort(durSec)}
          </div>
        </div>
        <div className="text-center bg-bg-1 border border-line rounded px-3 py-1.5 shrink-0">
          <div className={`font-mono text-xl font-semibold leading-none ${moodColor}`}>
            {Math.round(score * 100)}
          </div>
          <div className="text-[9px] tracking-[0.14em] uppercase text-muted mt-0.5">
            focus
          </div>
        </div>
        <button
          aria-label="Close drawer"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-bg-1 border border-line text-muted hover:text-ink hover:border-line-2 text-lg leading-none inline-flex items-center justify-center"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
        {isActive ? (
          <div className="text-sm text-muted bg-bg-1 border border-line rounded-lg px-4 py-6 text-center">
            This task is in progress. App breakdown and event log will appear
            when you stop.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Switches
                </div>
                <div className="font-mono text-base text-ink">{switches}</div>
                <div className="text-[11px] text-muted mt-0.5 font-mono">
                  {switches === 0 ? 'one stretch' : `${segments.length} segments`}
                </div>
              </div>
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Longest
                </div>
                <div className="font-mono text-base">
                  {longest ? formatDurationShort(longest.seconds) : '—'}
                </div>
                <div
                  className="text-[11px] mt-0.5 font-mono"
                  style={{ color: longest ? appColor(longest.app) : undefined }}
                >
                  {longest?.app ?? ''}
                </div>
              </div>
              <div className="bg-bg-1 border border-line rounded-lg px-3 py-2.5">
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted mb-1">
                  Top app
                </div>
                <div
                  className="font-mono text-base"
                  style={{
                    color: slices[0] ? appColor(slices[0].app) : undefined,
                  }}
                >
                  {slices[0] ? `${slices[0].percent.toFixed(0)}%` : '—'}
                </div>
                <div className="text-[11px] text-muted mt-0.5 font-mono">
                  {slices[0]?.app ?? ''}
                </div>
              </div>
            </div>

            <div>
              <SectionLabel
                title="Attention trace"
                hint={`${formatClock(session.startedAt)} – ${formatClock(session.endedAt!)}`}
              />
              <div className="relative h-8 rounded bg-bg-1 border border-line overflow-hidden">
                {segments.map((seg, i) => {
                  const total = end - start;
                  const l = ((seg.start - start) / total) * 100;
                  const w = ((seg.end - seg.start) / total) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${l}%`,
                        width: `${w}%`,
                        background: appColor(seg.app),
                      }}
                      title={`${seg.app}${seg.title ? ` · ${seg.title}` : ''} · ${formatDurationShort((seg.end - seg.start) / 1000)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1.5 font-mono text-[10px] text-muted-2">
                <span>{formatClock(session.startedAt)}</span>
                <span>{formatClock(session.endedAt!)}</span>
              </div>
            </div>

            <div>
              <SectionLabel
                title="App breakdown"
                hint={`${slices.length} apps`}
              />
              <ul className="list-none p-0 m-0 flex flex-col gap-1">
                {slices.map((s) => (
                  <li
                    key={s.app}
                    className="grid grid-cols-[8px_100px_1fr_40px_60px] gap-2.5 items-center py-1 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: appColor(s.app) }}
                    />
                    <span className="text-ink-2 truncate">{s.app}</span>
                    <div className="h-1 bg-bg-1 rounded-sm overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${s.percent}%`,
                          background: appColor(s.app),
                        }}
                      />
                    </div>
                    <span className="text-right font-mono text-[11px] text-muted">
                      {s.percent.toFixed(0)}%
                    </span>
                    <span className="text-right font-mono text-[11px] text-ink-2">
                      {formatDurationShort(s.seconds)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionLabel
                title="Event log"
                hint={`${session.events.length} events`}
              />
              <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                {session.events.map((e) => (
                  <li
                    key={e.id}
                    className="grid grid-cols-[44px_10px_90px_1fr_56px] gap-2 items-center py-1 px-1.5 rounded hover:bg-bg-1 text-[11px]"
                  >
                    <span className="text-muted font-mono">
                      {formatClock(e.timestamp)}
                    </span>
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: appColor(e.data.app) }}
                    />
                    <span className="text-ink-2 font-mono truncate">
                      {e.data.app}
                    </span>
                    <span className="text-ink truncate">{e.data.title}</span>
                    <span className="text-right text-muted font-mono">
                      {formatDurationShort(e.duration)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 px-6 py-3.5 border-t border-line bg-[#0a0b0e]">
        <button
          onClick={() => {
            setNameDraft(session.name);
            setRenaming(true);
          }}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 border border-line-2 bg-bg-1 hover:text-ink hover:border-muted-2"
        >
          Rename
        </button>
        {isActive ? (
          <button
            onClick={() => stopActive()}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-ink-2 bg-bg-2 border border-line-2 hover:bg-bad hover:text-[#2a0808] hover:border-bad"
          >
            Stop task
          </button>
        ) : (
          <button
            onClick={() => startTask(session.name)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-[#0b0c10] border border-transparent hover:bg-accent-2"
          >
            Resume
          </button>
        )}
      </div>
    </>
  );
}

function SectionLabel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[10px] tracking-[0.14em] uppercase text-muted">
        {title}
      </span>
      <span className="font-mono text-[10px] text-muted-2">{hint}</span>
    </div>
  );
}
