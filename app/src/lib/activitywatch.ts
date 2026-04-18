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
  // The aw-watcher-web browser extension reports client=aw-client-web and
  // type=web.tab.current. The bucket id is aw-watcher-web-<browser>[_<host>].
  // Match on type — it's the canonical AW identifier and is stable across
  // browsers and client-name changes. Prefer a host-suffixed id when both
  // a generic and host-suffixed bucket exist (the host-suffixed one is
  // usually the actively-updated per-device bucket).
  const webBuckets = Object.values(buckets).filter(
    (b) => b.type === 'web.tab.current',
  );
  if (webBuckets.length === 0) return null;
  const hostSuffixed = webBuckets.find((b) => b.id.includes('_'));
  return (hostSuffixed ?? webBuckets[0]).id;
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
