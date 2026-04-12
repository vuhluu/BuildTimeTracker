import type { AppSlice, TaskSession } from '../types';
import { groupByApp, mergeBreakdowns } from './aggregation';

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
