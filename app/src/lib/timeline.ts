import type { AWEvent } from '../types';
import { toSegments } from './segments';

export function contextSwitches(events: AWEvent[]): number {
  const segments = toSegments(events);
  return Math.max(0, segments.length - 1);
}

export function longestStretch(events: AWEvent[]): {
  app: string;
  seconds: number;
} | null {
  const segments = toSegments(events);
  if (segments.length === 0) return null;
  let best = segments[0];
  let bestSec = (best.end - best.start) / 1000;
  for (const seg of segments) {
    const sec = (seg.end - seg.start) / 1000;
    if (sec > bestSec) {
      best = seg;
      bestSec = sec;
    }
  }
  return { app: best.app, seconds: bestSec };
}

export function detectInterruptions(
  events: AWEvent[],
  thresholdSec = 180,
): Set<number> {
  const segments = toSegments(events);
  const interrupted = new Set<number>();
  for (let i = 1; i < segments.length - 1; i++) {
    const prev = segments[i - 1];
    const mid = segments[i];
    const next = segments[i + 1];
    const midDurationSec = (mid.end - mid.start) / 1000;
    if (
      prev.app === next.app &&
      mid.app !== prev.app &&
      midDurationSec < thresholdSec
    ) {
      for (const id of mid.ids) interrupted.add(id);
    }
  }
  return interrupted;
}
