import { describe, it, expect } from 'vitest';
import {
  aggregateSessions,
  dailyTotals,
  daysInRange,
  priorRangeOf,
  recurringTasks,
  taskDayMatrix,
  topAppsInRange,
} from '../../lib/aggregate-range';
import type { AWEvent, TaskSession } from '../../types';

// Build a session on a given local-time day, with a single event of equal duration.
function mkSession(
  id: string,
  name: string,
  startIso: string,
  durSec: number,
  app = 'VS Code',
): TaskSession {
  const endIso = new Date(new Date(startIso).getTime() + durSec * 1000).toISOString();
  const event: AWEvent = {
    id: 1,
    timestamp: startIso,
    duration: durSec,
    data: { app, title: name },
  };
  return { id, name, startedAt: startIso, endedAt: endIso, events: [event] };
}

// Helpers: build ISO timestamps for local dates (YYYY-MM-DD).
function localAt10(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 10, 0, 0).toISOString();
}
function dayStart(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
function dayEnd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

describe('daysInRange', () => {
  it('enumerates each local day between the bounds inclusive', () => {
    const start = localAt10('2026-04-13');
    const end = localAt10('2026-04-15');
    expect(daysInRange(start, end)).toEqual(['2026-04-13', '2026-04-14', '2026-04-15']);
  });
});

describe('dailyTotals', () => {
  it('sums seconds per local day, zero-fills missing days', () => {
    const sessions = [
      mkSession('a', 'T1', localAt10('2026-04-13'), 1800),
      mkSession('b', 'T2', localAt10('2026-04-15'), 600),
    ];
    const totals = dailyTotals(sessions, dayStart('2026-04-13'), dayEnd('2026-04-15'));
    expect(totals['2026-04-13']).toBe(1800);
    expect(totals['2026-04-14']).toBe(0);
    expect(totals['2026-04-15']).toBe(600);
  });
});

describe('taskDayMatrix', () => {
  it('returns rows sorted by total desc with per-day breakdown', () => {
    const sessions = [
      mkSession('a', 'A', localAt10('2026-04-13'), 3600),
      mkSession('b', 'A', localAt10('2026-04-14'), 1800),
      mkSession('c', 'B', localAt10('2026-04-13'), 900),
    ];
    const m = taskDayMatrix(sessions, dayStart('2026-04-13'), dayEnd('2026-04-14'));
    expect(m.rows.map((r) => r.name)).toEqual(['A', 'B']);
    expect(m.rows[0].perDay['2026-04-13']).toBe(3600);
    expect(m.rows[0].perDay['2026-04-14']).toBe(1800);
    expect(m.rows[0].total).toBe(5400);
    expect(m.dayTotals['2026-04-13']).toBe(3600 + 900);
    expect(m.grandTotal).toBe(3600 + 1800 + 900);
  });
});

describe('recurringTasks', () => {
  it('only includes tasks appearing on ≥2 distinct days', () => {
    const sessions = [
      mkSession('a', 'Recurring', localAt10('2026-04-13'), 1800),
      mkSession('b', 'Recurring', localAt10('2026-04-14'), 3600),
      mkSession('c', 'OneOff', localAt10('2026-04-13'), 600),
    ];
    const rows = recurringTasks(
      sessions,
      dayStart('2026-04-13'),
      dayEnd('2026-04-14'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Recurring');
    expect(rows[0].runs).toBe(2);
    expect(rows[0].daysActive).toBe(2);
    expect(rows[0].totalSec).toBe(5400);
    expect(rows[0].avgSec).toBe(2700);
    expect(rows[0].bestSec).toBe(1800);
    expect(rows[0].worstSec).toBe(3600);
    expect(rows[0].perDaySec).toEqual([1800, 3600]);
    expect(rows[0].priorTotalSec).toBeNull();
    expect(rows[0].deltaPct).toBeNull();
  });

  it('computes deltaPct when a prior range is provided', () => {
    const sessions = [
      // Prior week
      mkSession('p1', 'Fix bug', localAt10('2026-04-06'), 1000),
      mkSession('p2', 'Fix bug', localAt10('2026-04-07'), 1000),
      // Current week
      mkSession('c1', 'Fix bug', localAt10('2026-04-13'), 2000),
      mkSession('c2', 'Fix bug', localAt10('2026-04-14'), 2000),
    ];
    const rows = recurringTasks(
      sessions,
      dayStart('2026-04-13'),
      dayEnd('2026-04-14'),
      dayStart('2026-04-06'),
      dayEnd('2026-04-07'),
    );
    expect(rows[0].priorTotalSec).toBe(2000);
    // 4000 current vs 2000 prior → +100%
    expect(rows[0].deltaPct).toBeCloseTo(1.0, 3);
  });
});

describe('topAppsInRange', () => {
  it('aggregates seconds per app and ranks desc', () => {
    const sessions = [
      mkSession('a', 'T', localAt10('2026-04-13'), 3600, 'VS Code'),
      mkSession('b', 'T', localAt10('2026-04-14'), 1800, 'Chrome'),
      mkSession('c', 'T', localAt10('2026-04-14'), 600, 'VS Code'),
    ];
    const apps = topAppsInRange(
      sessions,
      dayStart('2026-04-13'),
      dayEnd('2026-04-14'),
    );
    expect(apps[0].app).toBe('VS Code');
    expect(apps[0].seconds).toBe(4200);
    expect(apps[1].app).toBe('Chrome');
    expect(apps[0].priorSeconds).toBeNull();
  });

  it('fills priorSeconds + deltaPct when a prior range is provided', () => {
    const sessions = [
      mkSession('p', 'T', localAt10('2026-04-06'), 1000, 'VS Code'),
      mkSession('c', 'T', localAt10('2026-04-13'), 3000, 'VS Code'),
    ];
    const apps = topAppsInRange(
      sessions,
      dayStart('2026-04-13'),
      dayEnd('2026-04-13'),
      dayStart('2026-04-06'),
      dayEnd('2026-04-06'),
    );
    expect(apps[0].priorSeconds).toBe(1000);
    expect(apps[0].deltaPct).toBeCloseTo(2.0, 3); // (3000 - 1000) / 1000
  });
});

describe('priorRangeOf', () => {
  it('returns a same-length range ending just before the current range starts', () => {
    const { startIso, endIso } = priorRangeOf(
      '2026-04-13T00:00:00.000Z',
      '2026-04-19T23:59:59.999Z',
    );
    const priorLen = new Date(endIso).getTime() - new Date(startIso).getTime();
    const curLen =
      new Date('2026-04-19T23:59:59.999Z').getTime() -
      new Date('2026-04-13T00:00:00.000Z').getTime();
    expect(priorLen).toBeCloseTo(curLen, -3); // within a second
    expect(new Date(endIso).getTime()).toBe(
      new Date('2026-04-13T00:00:00.000Z').getTime() - 1,
    );
  });
});

describe('aggregateSessions (regression)', () => {
  it('still groups by task name and computes totals', () => {
    const sessions = [
      mkSession('a', 'T', localAt10('2026-04-13'), 1000),
      mkSession('b', 'T', localAt10('2026-04-14'), 2000),
    ];
    const rows = aggregateSessions(
      sessions,
      dayStart('2026-04-13'),
      dayEnd('2026-04-14'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].totalSec).toBe(3000);
    expect(rows[0].sessionCount).toBe(2);
  });
});
