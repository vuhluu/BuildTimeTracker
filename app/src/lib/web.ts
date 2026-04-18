import type { WebCategory, WebEvent, WebVisit } from '../types';
import { domainCategory, extractDomain } from './web-categories';

export function eventsToVisits(events: WebEvent[]): WebVisit[] {
  return events.map((e) => ({
    timestamp: e.timestamp,
    domain: e.data.domain ?? extractDomain(e.data.url),
    url: e.data.url,
    title: e.data.title,
    duration: e.duration,
  }));
}

export type DomainGroup = {
  domain: string;
  seconds: number;
  count: number;
  urls: { url: string; title: string; seconds: number; count: number }[];
};

export function groupByDomain(visits: WebVisit[]): DomainGroup[] {
  const domains = new Map<string, DomainGroup>();
  for (const v of visits) {
    const entry =
      domains.get(v.domain) ??
      ({ domain: v.domain, seconds: 0, count: 0, urls: [] } as DomainGroup);
    entry.seconds += v.duration;
    entry.count += 1;

    const existing = entry.urls.find((u) => u.url === v.url);
    if (existing) {
      existing.seconds += v.duration;
      existing.count += 1;
    } else {
      entry.urls.push({
        url: v.url,
        title: v.title,
        seconds: v.duration,
        count: 1,
      });
    }
    domains.set(v.domain, entry);
  }
  const out = Array.from(domains.values());
  for (const d of out) {
    d.urls.sort((a, b) => b.seconds - a.seconds);
  }
  out.sort((a, b) => b.seconds - a.seconds);
  return out;
}

export type CategoryGroup = {
  category: WebCategory;
  seconds: number;
  count: number;
  domains: { domain: string; seconds: number }[];
};

export function groupByCategory(visits: WebVisit[]): CategoryGroup[] {
  const cats = new Map<WebCategory, CategoryGroup>();
  for (const v of visits) {
    const c = domainCategory(v.domain);
    const entry =
      cats.get(c) ??
      ({ category: c, seconds: 0, count: 0, domains: [] } as CategoryGroup);
    entry.seconds += v.duration;
    entry.count += 1;
    const d = entry.domains.find((x) => x.domain === v.domain);
    if (d) d.seconds += v.duration;
    else entry.domains.push({ domain: v.domain, seconds: v.duration });
    cats.set(c, entry);
  }
  const out = Array.from(cats.values());
  for (const c of out) {
    c.domains.sort((a, b) => b.seconds - a.seconds);
  }
  out.sort((a, b) => b.seconds - a.seconds);
  return out;
}
