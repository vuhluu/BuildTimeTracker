import { describe, expect, it } from 'vitest';
import {
  contextSwitches,
  detectInterruptions,
  longestStretch,
} from '../../lib/timeline';
import type { AWEvent } from '../../types';

function ev(
  id: number,
  app: string,
  timestamp: string,
  duration: number,
): AWEvent {
  return { id, timestamp, duration, data: { app } };
}

describe('contextSwitches', () => {
  it('counts adjacent app changes (coalesced)', () => {
    const events = [
      ev(1, 'Code', '2026-04-11T10:00:00Z', 60),
      ev(2, 'Code', '2026-04-11T10:01:00Z', 60),
      ev(3, 'Safari', '2026-04-11T10:02:00Z', 60),
      ev(4, 'Code', '2026-04-11T10:03:00Z', 60),
    ];
    expect(contextSwitches(events)).toBe(2);
  });

  it('returns 0 for empty input', () => {
    expect(contextSwitches([])).toBe(0);
  });
});

describe('longestStretch', () => {
  it('returns the longest same-app run', () => {
    const events = [
      ev(1, 'Code', '2026-04-11T10:00:00Z', 120),
      ev(2, 'Code', '2026-04-11T10:02:00Z', 120),
      ev(3, 'Safari', '2026-04-11T10:04:00Z', 60),
      ev(4, 'Code', '2026-04-11T10:05:00Z', 60),
    ];
    const best = longestStretch(events)!;
    expect(best.app).toBe('Code');
    expect(best.seconds).toBe(240);
  });

  it('returns null when there are no events', () => {
    expect(longestStretch([])).toBeNull();
  });
});

describe('detectInterruptions', () => {
  it('marks short A->B->A interruptions', () => {
    const events = [
      ev(1, 'Code', '2026-04-11T10:00:00Z', 120),
      ev(2, 'Slack', '2026-04-11T10:02:00Z', 60), // 60s, threshold 180 → interruption
      ev(3, 'Code', '2026-04-11T10:03:00Z', 120),
    ];
    const marks = detectInterruptions(events);
    expect(marks.has(2)).toBe(true);
    expect(marks.has(1)).toBe(false);
    expect(marks.has(3)).toBe(false);
  });

  it('does NOT mark long stretches', () => {
    const events = [
      ev(1, 'Code', '2026-04-11T10:00:00Z', 60),
      ev(2, 'Slack', '2026-04-11T10:01:00Z', 600), // 10 min, > 180
      ev(3, 'Code', '2026-04-11T10:11:00Z', 60),
    ];
    expect(detectInterruptions(events).size).toBe(0);
  });
});
