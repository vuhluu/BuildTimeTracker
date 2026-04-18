import type { AWEvent } from '../types';

export type Segment = {
  app: string;
  title?: string;
  start: number;
  end: number;
  ids: number[];
};

export function toSegments(events: AWEvent[]): Segment[] {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const segments: Segment[] = [];
  for (const ev of sorted) {
    const start = new Date(ev.timestamp).getTime();
    const end = start + ev.duration * 1000;
    const last = segments[segments.length - 1];
    if (last && last.app === ev.data.app && start - last.end <= 1000) {
      last.end = Math.max(last.end, end);
      last.ids.push(ev.id);
    } else {
      segments.push({
        app: ev.data.app,
        title: ev.data.title,
        start,
        end,
        ids: [ev.id],
      });
    }
  }
  return segments;
}
