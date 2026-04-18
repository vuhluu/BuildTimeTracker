import type { AWEvent, WebEvent } from '../types';

const BASE = '/aw/api/0';

export type AWBucket = {
  id: string;
  client: string;
  type: string;
  hostname: string;
};

export class ActivityWatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityWatchError';
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch (err) {
    throw new ActivityWatchError(
      `Failed to reach ActivityWatch at ${BASE}${path}: ${(err as Error).message}`,
    );
  }
  if (!res.ok) {
    throw new ActivityWatchError(`ActivityWatch ${res.status} on ${path}`);
  }
  return (await res.json()) as T;
}

export async function listBuckets(): Promise<Record<string, AWBucket>> {
  return request<Record<string, AWBucket>>('/buckets/');
}

export async function findWindowBucket(): Promise<string | null> {
  const buckets = await listBuckets();
  const match = Object.values(buckets).find(
    (b) => b.client === 'aw-watcher-window',
  );
  return match?.id ?? null;
}

export async function fetchEvents(
  bucketId: string,
  startIso: string,
  endIso: string,
): Promise<AWEvent[]> {
  const params = new URLSearchParams({
    start: startIso,
    end: endIso,
    limit: '5000',
  });
  return request<AWEvent[]>(
    `/buckets/${encodeURIComponent(bucketId)}/events?${params.toString()}`,
  );
}

export async function findWebBucket(): Promise<string | null> {
  const buckets = await listBuckets();
  // AW registers per-browser web watchers as aw-watcher-web-chrome,
  // aw-watcher-web-firefox, aw-watcher-web-edge, etc. Match any of them.
  const match = Object.values(buckets).find((b) =>
    b.client.startsWith('aw-watcher-web'),
  );
  return match?.id ?? null;
}

export async function fetchWebEvents(
  bucketId: string,
  startIso: string,
  endIso: string,
): Promise<WebEvent[]> {
  const params = new URLSearchParams({
    start: startIso,
    end: endIso,
    limit: '5000',
  });
  return request<WebEvent[]>(
    `/buckets/${encodeURIComponent(bucketId)}/events?${params.toString()}`,
  );
}
