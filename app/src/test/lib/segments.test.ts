import { describe, it, expect } from 'vitest';
import { toSegments } from '../../lib/segments';
import type { AWEvent } from '../../types';

function ev(id: number, app: string, isoStart: string, durSec: number): AWEvent {
  return { id, timestamp: isoStart, duration: durSec, data: { app } };
}

describe('toSegments', () => {
  it('returns empty array for no events', () => {
    expect(toSegments([])).toEqual([]);
  });

  it('merges consecutive same-app events with <= 1s gap', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'VS Code', '2026-04-18T09:00:30.500Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(1);
    expect(segs[0].app).toBe('VS Code');
    expect(segs[0].ids).toEqual([1, 2]);
    expect(segs[0].end - segs[0].start).toBe(60_500);
  });

  it('splits on same-app gap > 1s', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'VS Code', '2026-04-18T09:00:31.500Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(2);
    expect(segs[0].ids).toEqual([1]);
    expect(segs[1].ids).toEqual([2]);
  });

  it('splits on app change', () => {
    const events: AWEvent[] = [
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
      ev(2, 'Slack',   '2026-04-18T09:00:30.500Z', 30),
      ev(3, 'VS Code', '2026-04-18T09:01:01.000Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs.map((s) => s.app)).toEqual(['VS Code', 'Slack', 'VS Code']);
  });

  it('sorts events by timestamp before merging', () => {
    const events: AWEvent[] = [
      ev(2, 'VS Code', '2026-04-18T09:00:30.000Z', 30),
      ev(1, 'VS Code', '2026-04-18T09:00:00.000Z', 30),
    ];
    const segs = toSegments(events);
    expect(segs).toHaveLength(1);
    expect(segs[0].ids).toEqual([1, 2]);
  });
});
