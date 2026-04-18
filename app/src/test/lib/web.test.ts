import { describe, it, expect } from 'vitest';
import {
  eventsToVisits,
  groupByDomain,
  groupByCategory,
} from '../../lib/web';
import type { WebEvent } from '../../types';

function ev(iso: string, url: string, title: string, duration: number): WebEvent {
  return { timestamp: iso, duration, data: { url, title } };
}

describe('eventsToVisits', () => {
  it('extracts the domain from the URL', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/foo/bar', 'Bar', 60),
    ]);
    expect(visits).toHaveLength(1);
    expect(visits[0].domain).toBe('github.com');
    expect(visits[0].url).toBe('https://github.com/foo/bar');
    expect(visits[0].title).toBe('Bar');
    expect(visits[0].duration).toBe(60);
  });

  it('uses data.domain when provided', () => {
    const visits = eventsToVisits([
      {
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 30,
        data: { url: 'x', title: 'x', domain: 'override.test' },
      },
    ]);
    expect(visits[0].domain).toBe('override.test');
  });
});

describe('groupByDomain', () => {
  it('sums durations and ranks by time desc', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/a', 'A', 60),
      ev('2026-04-18T09:02:00.000Z', 'https://github.com/b', 'B', 30),
      ev('2026-04-18T09:04:00.000Z', 'https://linear.app/', 'Linear', 120),
    ]);
    const grouped = groupByDomain(visits);
    expect(grouped[0].domain).toBe('linear.app');
    expect(grouped[0].seconds).toBe(120);
    expect(grouped[1].domain).toBe('github.com');
    expect(grouped[1].seconds).toBe(90);
    expect(grouped[1].count).toBe(2);
    expect(grouped[1].urls).toHaveLength(2);
  });
});

describe('groupByCategory', () => {
  it('aggregates by DomainMeta category, unknowns → Other', () => {
    const visits = eventsToVisits([
      ev('2026-04-18T09:00:00.000Z', 'https://github.com/a', 'A', 60),
      ev('2026-04-18T09:02:00.000Z', 'https://slack.com/', 'Slack', 30),
      ev('2026-04-18T09:04:00.000Z', 'https://random.test/', 'Who', 10),
    ]);
    const grouped = groupByCategory(visits);
    const cats = grouped.map((g) => g.category);
    expect(cats).toContain('Code');
    expect(cats).toContain('Comms');
    expect(cats).toContain('Other');
  });
});
