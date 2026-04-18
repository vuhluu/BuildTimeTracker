import type { AppSlice, TaskSession } from '../types';
import { groupByApp, mergeBreakdowns } from './aggregation';
import { addDays, dayKey } from './week';
import { startOfLocalDay } from './time';

export type AggregatedRow = {
  name: string;
  totalSec: number;
  sessionCount: number;
  avgSec: number;
  breakdown: AppSlice[];
};

function clampSessionToRange(
  session: TaskSession,
  rangeStart: number,
  rangeEnd: number,
): { start: number; end: number } | null {
  const sStart = new Date(session.startedAt).getTime();
  const sEnd = new Date(
    session.endedAt ?? new Date().toISOString(),
  ).getTime();
  const start = Math.max(sStart, rangeStart);
  const end = Math.min(sEnd, rangeEnd);
  if (end <= start) return null;
  return { start, end };
}

export function aggregateSessions(
  sessions: TaskSession[],
  rangeStartIso: string,
  rangeEndIso: string,
  taskNameFilter?: string,
): AggregatedRow[] {
  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();

  const grouped = new Map<
    string,
    { totalSec: number; count: number; slices: AppSlice[][] }
  >();

  for (const session of sessions) {
    if (taskNameFilter && session.name !== taskNameFilter) continue;
    const clipped = clampSessionToRange(session, rangeStart, rangeEnd);
    if (!clipped) continue;
    const totalSec = (clipped.end - clipped.start) / 1000;
    const slice = groupByApp(
      session.events,
      new Date(clipped.start).toISOString(),
      new Date(clipped.end).toISOString(),
    );
    const entry = grouped.get(session.name) ?? {
      totalSec: 0,
      count: 0,
      slices: [],
    };
    entry.totalSec += totalSec;
    entry.count += 1;
    entry.slices.push(slice);
    grouped.set(session.name, entry);
  }

  const rows: AggregatedRow[] = [];
  for (const [name, entry] of grouped.entries()) {
    rows.push({
      name,
      totalSec: entry.totalSec,
      sessionCount: entry.count,
      avgSec: entry.count > 0 ? entry.totalSec / entry.count : 0,
      breakdown: mergeBreakdowns(entry.slices),
    });
  }
  rows.sort((a, b) => b.totalSec - a.totalSec);
  return rows;
}

/**
 * Generates the sequence of local-day keys from rangeStart (inclusive) to
 * rangeEnd (inclusive), one per day. Both bounds are clamped to local-day
 * boundaries.
 */
export function daysInRange(
  rangeStartIso: string,
  rangeEndIso: string,
): string[] {
  const first = startOfLocalDay(new Date(rangeStartIso));
  const last = startOfLocalDay(new Date(rangeEndIso));
  const keys: string[] = [];
  let cursor = first;
  while (cursor.getTime() <= last.getTime()) {
    keys.push(dayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/**
 * Seconds of tracked time per local day within the range. All days in the
 * range appear in the result, zero-filled if no sessions.
 */
export function dailyTotals(
  sessions: TaskSession[],
  rangeStartIso: string,
  rangeEndIso: string,
): Record<string, number> {
  const days = daysInRange(rangeStartIso, rangeEndIso);
  const totals: Record<string, number> = Object.fromEntries(
    days.map((d) => [d, 0]),
  );
  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();
  for (const s of sessions) {
    const clipped = clampSessionToRange(s, rangeStart, rangeEnd);
    if (!clipped) continue;
    // Split the session's duration across the days it spans.
    let cursor = clipped.start;
    while (cursor < clipped.end) {
      const dayStart = startOfLocalDay(new Date(cursor)).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const segEnd = Math.min(clipped.end, dayEnd);
      const key = dayKey(new Date(cursor));
      if (key in totals) {
        totals[key] += (segEnd - cursor) / 1000;
      }
      cursor = segEnd;
    }
  }
  return totals;
}

/**
 * Matrix of seconds per task × day. Rows are sorted by total desc.
 */
export type TaskDayMatrix = {
  days: string[];
  rows: { name: string; perDay: Record<string, number>; total: number }[];
  dayTotals: Record<string, number>;
  grandTotal: number;
};

export function taskDayMatrix(
  sessions: TaskSession[],
  rangeStartIso: string,
  rangeEndIso: string,
): TaskDayMatrix {
  const days = daysInRange(rangeStartIso, rangeEndIso);
  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();

  const grouped = new Map<string, Record<string, number>>();
  for (const s of sessions) {
    const clipped = clampSessionToRange(s, rangeStart, rangeEnd);
    if (!clipped) continue;
    let perDay = grouped.get(s.name);
    if (!perDay) {
      perDay = Object.fromEntries(days.map((d) => [d, 0]));
      grouped.set(s.name, perDay);
    }
    let cursor = clipped.start;
    while (cursor < clipped.end) {
      const dayStart = startOfLocalDay(new Date(cursor)).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const segEnd = Math.min(clipped.end, dayEnd);
      const key = dayKey(new Date(cursor));
      if (key in perDay) perDay[key] += (segEnd - cursor) / 1000;
      cursor = segEnd;
    }
  }

  const dayTotals: Record<string, number> = Object.fromEntries(
    days.map((d) => [d, 0]),
  );
  const rows = [...grouped.entries()]
    .map(([name, perDay]) => {
      const total = Object.values(perDay).reduce((a, b) => a + b, 0);
      for (const d of days) dayTotals[d] += perDay[d];
      return { name, perDay, total };
    })
    .sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((a, r) => a + r.total, 0);
  return { days, rows, dayTotals, grandTotal };
}

/**
 * Tasks whose sessions span ≥2 distinct days in the range, with stats for
 * a week-over-week review table. Sorted by totalSec desc.
 */
export type RecurringTask = {
  name: string;
  runs: number;
  daysActive: number;
  totalSec: number;
  avgSec: number;
  bestSec: number;
  worstSec: number;
  perDaySec: number[]; // one entry per day in the range, for sparkline
  priorTotalSec: number | null;
  deltaPct: number | null; // (current - prior) / prior, null if no prior
};

export function recurringTasks(
  sessions: TaskSession[],
  rangeStartIso: string,
  rangeEndIso: string,
  priorRangeStartIso?: string,
  priorRangeEndIso?: string,
): RecurringTask[] {
  const days = daysInRange(rangeStartIso, rangeEndIso);
  const matrix = taskDayMatrix(sessions, rangeStartIso, rangeEndIso);

  const rangeStart = new Date(rangeStartIso).getTime();
  const rangeEnd = new Date(rangeEndIso).getTime();
  const perSessionDurations = new Map<string, number[]>();
  for (const s of sessions) {
    const clipped = clampSessionToRange(s, rangeStart, rangeEnd);
    if (!clipped) continue;
    const list = perSessionDurations.get(s.name) ?? [];
    list.push((clipped.end - clipped.start) / 1000);
    perSessionDurations.set(s.name, list);
  }

  const priorTotals =
    priorRangeStartIso && priorRangeEndIso
      ? new Map(
          aggregateSessions(sessions, priorRangeStartIso, priorRangeEndIso).map(
            (r) => [r.name, r.totalSec],
          ),
        )
      : null;

  const out: RecurringTask[] = [];
  for (const row of matrix.rows) {
    const daysActive = days.filter((d) => (row.perDay[d] ?? 0) > 0).length;
    if (daysActive < 2) continue;
    const durations = perSessionDurations.get(row.name) ?? [];
    if (durations.length === 0) continue;
    const total = durations.reduce((a, b) => a + b, 0);
    const prior = priorTotals?.get(row.name) ?? null;
    const deltaPct =
      prior != null && prior > 0 ? (total - prior) / prior : null;
    out.push({
      name: row.name,
      runs: durations.length,
      daysActive,
      totalSec: total,
      avgSec: total / durations.length,
      bestSec: Math.min(...durations),
      worstSec: Math.max(...durations),
      perDaySec: days.map((d) => row.perDay[d] ?? 0),
      priorTotalSec: prior,
      deltaPct,
    });
  }
  out.sort((a, b) => b.totalSec - a.totalSec);
  return out;
}

/**
 * Top apps across all sessions in range, aggregated and sorted by seconds.
 * Each slice includes an optional prior-range total for week-over-week delta.
 */
export type AppRollup = {
  app: string;
  seconds: number;
  percent: number;
  priorSeconds: number | null;
  deltaPct: number | null;
};

export function topAppsInRange(
  sessions: TaskSession[],
  rangeStartIso: string,
  rangeEndIso: string,
  priorRangeStartIso?: string,
  priorRangeEndIso?: string,
): AppRollup[] {
  function sumByApp(startIso: string, endIso: string): Map<string, number> {
    const rangeStart = new Date(startIso).getTime();
    const rangeEnd = new Date(endIso).getTime();
    const totals = new Map<string, number>();
    for (const s of sessions) {
      const clipped = clampSessionToRange(s, rangeStart, rangeEnd);
      if (!clipped) continue;
      const slices = groupByApp(
        s.events,
        new Date(clipped.start).toISOString(),
        new Date(clipped.end).toISOString(),
      );
      for (const sl of slices) {
        totals.set(sl.app, (totals.get(sl.app) ?? 0) + sl.seconds);
      }
    }
    return totals;
  }

  const current = sumByApp(rangeStartIso, rangeEndIso);
  const prior =
    priorRangeStartIso && priorRangeEndIso
      ? sumByApp(priorRangeStartIso, priorRangeEndIso)
      : null;

  const total = Array.from(current.values()).reduce((a, b) => a + b, 0);
  const out: AppRollup[] = [];
  for (const [app, seconds] of current.entries()) {
    const priorSeconds = prior?.get(app) ?? null;
    const deltaPct =
      priorSeconds != null && priorSeconds > 0
        ? (seconds - priorSeconds) / priorSeconds
        : null;
    out.push({
      app,
      seconds,
      percent: total > 0 ? (seconds / total) * 100 : 0,
      priorSeconds,
      deltaPct,
    });
  }
  out.sort((a, b) => b.seconds - a.seconds);
  return out;
}

/**
 * The prior range aligned to the same length as `[start, end)`, ending
 * exactly at the start of the current range.
 */
export function priorRangeOf(
  rangeStartIso: string,
  rangeEndIso: string,
): { startIso: string; endIso: string } {
  const start = new Date(rangeStartIso).getTime();
  const end = new Date(rangeEndIso).getTime();
  const len = end - start;
  const priorEnd = new Date(start - 1).toISOString();
  const priorStart = new Date(start - len).toISOString();
  return { startIso: priorStart, endIso: priorEnd };
}
