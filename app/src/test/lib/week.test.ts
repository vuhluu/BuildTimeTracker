import { describe, it, expect } from 'vitest';
import { startOfWeek, addDays, dayKey, weekDays } from '../../lib/week';

describe('startOfWeek', () => {
  it('returns Monday 00:00:00 for a mid-week date', () => {
    const sat = new Date(2026, 3, 18, 17, 30);
    const mon = startOfWeek(sat);
    expect(mon.getFullYear()).toBe(2026);
    expect(mon.getMonth()).toBe(3);
    expect(mon.getDate()).toBe(13);
    expect(mon.getHours()).toBe(0);
    expect(mon.getMinutes()).toBe(0);
  });

  it('handles Sunday (rolls back to previous Monday)', () => {
    const sun = new Date(2026, 3, 19, 12, 0);
    const mon = startOfWeek(sun);
    expect(mon.getDate()).toBe(13);
  });

  it('handles Monday (returns same day)', () => {
    const mon = new Date(2026, 3, 13, 15, 0);
    const got = startOfWeek(mon);
    expect(got.getDate()).toBe(13);
    expect(got.getHours()).toBe(0);
  });
});

describe('addDays', () => {
  it('adds whole days preserving the time-of-day of input date', () => {
    const a = new Date(2026, 3, 13, 15, 30);
    const b = addDays(a, 2);
    expect(b.getDate()).toBe(15);
    expect(b.getHours()).toBe(15);
  });
});

describe('dayKey', () => {
  it('returns YYYY-MM-DD in local time', () => {
    const d = new Date(2026, 3, 13, 23, 59);
    expect(dayKey(d)).toBe('2026-04-13');
  });
});

describe('weekDays', () => {
  it('returns 7 entries Mon-Sun with date, name, shortDate, key', () => {
    const mon = new Date(2026, 3, 13);
    const days = weekDays(mon);
    expect(days).toHaveLength(7);
    expect(days[0].name).toBe('Mon');
    expect(days[6].name).toBe('Sun');
    expect(days[0].key).toBe('2026-04-13');
    expect(days[6].key).toBe('2026-04-19');
    expect(days[0].shortDate).toMatch(/Apr\s*13/);
  });
});
