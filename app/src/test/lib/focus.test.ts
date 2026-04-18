import { describe, it, expect } from 'vitest';
import { focusScore, dayFocusScore, moodClass } from '../../lib/focus';
import type { TaskSession, AWEvent } from '../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function session(
  id: string,
  startIso: string,
  endIso: string | null,
  events: AWEvent[],
): TaskSession {
  return {
    id,
    name: id,
    startedAt: startIso,
    endedAt: endIso,
    events,
  };
}

function ev(id: number, app: string, isoStart: string, durSec: number): AWEvent {
  return { id, timestamp: isoStart, duration: durSec, data: { app } };
}

describe('focusScore', () => {
  it('returns null for sessions under 60s', () => {
    const s = session('s1', '2026-04-18T16:59:30.000Z', '2026-04-18T16:59:59.000Z', []);
    expect(focusScore(s, NOW)).toBeNull();
  });

  it('returns 0.5 for a session with zero events', () => {
    const s = session('s1', '2026-04-18T16:00:00.000Z', '2026-04-18T16:30:00.000Z', []);
    expect(focusScore(s, NOW)).toBeCloseTo(0.5, 2);
  });

  it('scores a pure single-stretch session at the formula ceiling', () => {
    const s = session(
      's1',
      '2026-04-18T16:00:00.000Z',
      '2026-04-18T16:30:00.000Z',
      [ev(1, 'VS Code', '2026-04-18T16:00:00.000Z', 1800)],
    );
    // longestRatio = 1, switchPenalty = 0, score = 0.55 * 1 + 0.45 * 1 = 1.0
    expect(focusScore(s, NOW)).toBeCloseTo(1.0, 2);
  });

  it('penalises many switches', () => {
    // 10 different 1-minute segments → 9 switches, switchPenalty capped at 1
    const events: AWEvent[] = Array.from({ length: 10 }, (_, i) =>
      ev(i + 1, `App${i}`, `2026-04-18T16:${String(i).padStart(2, '0')}:00.000Z`, 60),
    );
    const s = session('s1', '2026-04-18T16:00:00.000Z', '2026-04-18T16:10:00.000Z', events);
    // longest = 60s, total = 600s, longestRatio = 0.1; switchPenalty = 1.
    // score = 0.55 * 0.1 + 0.45 * 0 = 0.055
    const score = focusScore(s, NOW);
    expect(score).toBeCloseTo(0.055, 2);
  });

  it('uses nowMs for active sessions', () => {
    const s = session('s1', '2026-04-18T16:30:00.000Z', null, [
      ev(1, 'VS Code', '2026-04-18T16:30:00.000Z', 1800),
    ]);
    const score = focusScore(s, NOW);
    // Same as the completed case above.
    expect(score).toBeCloseTo(1.0, 2);
  });
});

describe('dayFocusScore', () => {
  it('returns 0 for an empty day', () => {
    expect(dayFocusScore([], NOW)).toBe(0);
  });

  it('duration-weights per-session scores', () => {
    const a = session('a', '2026-04-18T10:00:00.000Z', '2026-04-18T10:30:00.000Z', [
      ev(1, 'VS Code', '2026-04-18T10:00:00.000Z', 1800),
    ]);
    const b = session('b', '2026-04-18T11:00:00.000Z', '2026-04-18T11:10:00.000Z', []);
    // a: score ~1.0, duration 1800
    // b: score 0.5, duration 600
    // expected: (1.0 * 1800 + 0.5 * 600) / 2400 = 0.875
    expect(dayFocusScore([a, b], NOW)).toBeCloseTo(0.875, 2);
  });
});

describe('moodClass', () => {
  it('bucketizes at 0.50 and 0.75', () => {
    expect(moodClass(0.74)).toBe('mixed');
    expect(moodClass(0.75)).toBe('deep');
    expect(moodClass(0.49)).toBe('scattered');
    expect(moodClass(0.50)).toBe('mixed');
  });
});
