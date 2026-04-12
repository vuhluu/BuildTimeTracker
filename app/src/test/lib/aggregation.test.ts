import { describe, expect, it } from 'vitest';
import {
  applyCustomOrder,
  clampEvent,
  groupByApp,
  mergeBreakdowns,
} from '../../lib/aggregation';
import type { AWEvent, AppSlice } from '../../types';

function ev(
  id: number,
  app: string,
  timestamp: string,
  duration: number,
): AWEvent {
  return { id, timestamp, duration, data: { app } };
}

describe('clampEvent', () => {
  it('clips events to the requested range', () => {
    const e = ev(1, 'Code', '2026-04-11T10:00:00.000Z', 600); // 10 min
    const start = new Date('2026-04-11T10:05:00.000Z').getTime();
    const end = new Date('2026-04-11T10:08:00.000Z').getTime();
    const result = clampEvent(e, start, end);
    expect(result.seconds).toBe(180);
    expect(result.app).toBe('Code');
  });

  it('returns 0 for non-overlapping events', () => {
    const e = ev(1, 'Code', '2026-04-11T09:00:00.000Z', 60);
    const start = new Date('2026-04-11T10:00:00.000Z').getTime();
    const end = new Date('2026-04-11T11:00:00.000Z').getTime();
    expect(clampEvent(e, start, end).seconds).toBe(0);
  });
});

describe('groupByApp', () => {
  it('sums per-app seconds within range and computes percents', () => {
    const events = [
      ev(1, 'Code', '2026-04-11T10:00:00.000Z', 300),
      ev(2, 'Safari', '2026-04-11T10:05:00.000Z', 60),
      ev(3, 'Code', '2026-04-11T10:06:00.000Z', 180),
    ];
    const slices = groupByApp(
      events,
      '2026-04-11T10:00:00.000Z',
      '2026-04-11T10:10:00.000Z',
    );
    expect(slices.map((s) => s.app)).toEqual(['Code', 'Safari']);
    const code = slices.find((s) => s.app === 'Code')!;
    const safari = slices.find((s) => s.app === 'Safari')!;
    expect(code.seconds).toBe(480);
    expect(safari.seconds).toBe(60);
    expect(code.percent + safari.percent).toBeCloseTo(100, 5);
  });

  it('returns empty array when no events overlap', () => {
    const events = [ev(1, 'Code', '2026-04-11T09:00:00.000Z', 60)];
    expect(
      groupByApp(
        events,
        '2026-04-11T10:00:00.000Z',
        '2026-04-11T11:00:00.000Z',
      ),
    ).toEqual([]);
  });
});

describe('applyCustomOrder', () => {
  it('orders apps per saved order, unknowns appended by seconds desc', () => {
    const slices: AppSlice[] = [
      { app: 'Code', seconds: 500, percent: 50 },
      { app: 'Safari', seconds: 300, percent: 30 },
      { app: 'Slack', seconds: 200, percent: 20 },
    ];
    const reordered = applyCustomOrder(slices, ['Slack', 'Code']);
    expect(reordered.map((s) => s.app)).toEqual(['Slack', 'Code', 'Safari']);
  });

  it('is a no-op when order is empty', () => {
    const slices: AppSlice[] = [
      { app: 'Code', seconds: 500, percent: 50 },
      { app: 'Safari', seconds: 300, percent: 30 },
    ];
    expect(applyCustomOrder(slices, undefined)).toEqual(slices);
  });
});

describe('mergeBreakdowns', () => {
  it('merges per-session breakdowns into a single roll-up', () => {
    const a: AppSlice[] = [
      { app: 'Code', seconds: 100, percent: 100 },
    ];
    const b: AppSlice[] = [
      { app: 'Code', seconds: 200, percent: 50 },
      { app: 'Safari', seconds: 200, percent: 50 },
    ];
    const merged = mergeBreakdowns([a, b]);
    const code = merged.find((s) => s.app === 'Code')!;
    expect(code.seconds).toBe(300);
    expect(code.percent).toBe(60);
  });
});
