import type { AWEvent } from '../types';

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
