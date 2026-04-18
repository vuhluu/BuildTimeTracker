import type { TaskSession } from '../types';
import { toSegments } from './segments';

export type Mood = 'deep' | 'mixed' | 'scattered';

export function sessionDurationSec(session: TaskSession, nowMs: number): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.endedAt ? new Date(session.endedAt).getTime() : nowMs;
  return Math.max(0, (end - start) / 1000);
}

export function focusScore(
  session: TaskSession,
  nowMs: number,
): number | null {
  const durSec = sessionDurationSec(session, nowMs);
  if (durSec < 60) return null;
  const segs = toSegments(session.events);
  if (segs.length === 0) return 0.5;
  const longestMs = segs.reduce((a, s) => Math.max(a, s.end - s.start), 0);
  const longestSec = longestMs / 1000;
  const switches = Math.max(0, segs.length - 1);
  const longestRatio = Math.min(1, longestSec / Math.max(60, durSec));
  const switchPenalty = Math.min(1, switches / 8);
  const score = 0.55 * longestRatio + 0.45 * (1 - switchPenalty);
  return Math.max(0, Math.min(1, score));
}

export function dayFocusScore(
  sessions: TaskSession[],
  nowMs: number,
): number {
  const scored = sessions
    .map((s) => ({
      dur: sessionDurationSec(s, nowMs),
      score: focusScore(s, nowMs),
    }))
    .filter((x): x is { dur: number; score: number } => x.score != null);
  const totalDur = scored.reduce((a, b) => a + b.dur, 0);
  if (totalDur === 0) return 0;
  return scored.reduce((a, b) => a + b.score * b.dur, 0) / totalDur;
}

export function moodClass(score: number): Mood {
  if (score >= 0.75) return 'deep';
  if (score >= 0.5) return 'mixed';
  return 'scattered';
}
