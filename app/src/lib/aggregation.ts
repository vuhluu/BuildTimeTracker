import type { AWEvent, AppSlice } from '../types';

export function clampEvent(
  ev: AWEvent,
  rangeStart: number,
  rangeEnd: number,
): { app: string; seconds: number; start: number; end: number } {
  const start = new Date(ev.timestamp).getTime();
  const end = start + ev.duration * 1000;
  const clampedStart = Math.max(start, rangeStart);
  const clampedEnd = Math.min(end, rangeEnd);
  const seconds = Math.max(0, (clampedEnd - clampedStart) / 1000);
  return {
    app: ev.data.app,
    seconds,
    start: clampedStart,
    end: clampedEnd,
  };
}

export function groupByApp(
  events: AWEvent[],
  startIso: string,
  endIso: string,
): AppSlice[] {
  const rangeStart = new Date(startIso).getTime();
  const rangeEnd = new Date(endIso).getTime();
  const totals = new Map<string, number>();
  for (const ev of events) {
    const { app, seconds } = clampEvent(ev, rangeStart, rangeEnd);
    if (seconds <= 0) continue;
    totals.set(app, (totals.get(app) ?? 0) + seconds);
  }
  const entries = Array.from(totals.entries());
  const total = entries.reduce((acc, [, s]) => acc + s, 0);
  const slices: AppSlice[] = entries.map(([app, seconds]) => ({
    app,
    seconds,
    percent: total > 0 ? (seconds / total) * 100 : 0,
  }));
  slices.sort((a, b) => b.seconds - a.seconds);
  return slices;
}

export function applyCustomOrder(
  slices: AppSlice[],
  order: string[] | undefined,
): AppSlice[] {
  if (!order || order.length === 0) return slices;
  const index = new Map(order.map((app, i) => [app, i]));
  const ordered = [...slices];
  ordered.sort((a, b) => {
    const ai = index.has(a.app) ? (index.get(a.app) as number) : Infinity;
    const bi = index.has(b.app) ? (index.get(b.app) as number) : Infinity;
    if (ai !== bi) return ai - bi;
    return b.seconds - a.seconds;
  });
  return ordered;
}

export function mergeBreakdowns(list: AppSlice[][]): AppSlice[] {
  const totals = new Map<string, number>();
  for (const slices of list) {
    for (const s of slices) {
      totals.set(s.app, (totals.get(s.app) ?? 0) + s.seconds);
    }
  }
  const entries = Array.from(totals.entries());
  const total = entries.reduce((acc, [, s]) => acc + s, 0);
  const merged: AppSlice[] = entries.map(([app, seconds]) => ({
    app,
    seconds,
    percent: total > 0 ? (seconds / total) * 100 : 0,
  }));
  merged.sort((a, b) => b.seconds - a.seconds);
  return merged;
}
