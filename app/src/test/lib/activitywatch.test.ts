import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityWatchError,
  fetchEvents,
  fetchWebEvents,
  findWebBucket,
  findWindowBucket,
  listBuckets,
} from '../../lib/activitywatch';

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('activitywatch client', () => {
  it('lists buckets from the proxied API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ 'aw-watcher-window_host': { id: 'aw-watcher-window_host', client: 'aw-watcher-window', type: 'currentwindow', hostname: 'host' } }));
    vi.stubGlobal('fetch', fetchMock);
    const buckets = await listBuckets();
    expect(Object.keys(buckets)).toContain('aw-watcher-window_host');
    expect(fetchMock).toHaveBeenCalledWith('/aw/api/0/buckets/');
  });

  it('finds the first aw-watcher-window bucket', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          'aw-watcher-afk_host': { id: 'aw-watcher-afk_host', client: 'aw-watcher-afk', type: 'afkstatus', hostname: 'host' },
          'aw-watcher-window_host': { id: 'aw-watcher-window_host', client: 'aw-watcher-window', type: 'currentwindow', hostname: 'host' },
        }),
      ),
    );
    expect(await findWindowBucket()).toBe('aw-watcher-window_host');
  });

  it('returns null when no window bucket exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({})),
    );
    expect(await findWindowBucket()).toBeNull();
  });

  it('fetches events with encoded start/end params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    await fetchEvents(
      'aw-watcher-window_host',
      '2026-04-11T10:00:00.000Z',
      '2026-04-11T10:30:00.000Z',
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/aw/api/0/buckets/aw-watcher-window_host/events');
    expect(url).toContain('start=2026-04-11T10%3A00%3A00.000Z');
    expect(url).toContain('end=2026-04-11T10%3A30%3A00.000Z');
  });

  it('wraps network errors as ActivityWatchError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
    );
    await expect(listBuckets()).rejects.toBeInstanceOf(ActivityWatchError);
  });

  it('findWebBucket matches per-browser clients like aw-watcher-web-chrome', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          'aw-watcher-window_host': { id: 'aw-watcher-window_host', client: 'aw-watcher-window', type: 'currentwindow', hostname: 'host' },
          'aw-watcher-web-chrome_host': { id: 'aw-watcher-web-chrome_host', client: 'aw-watcher-web-chrome', type: 'web.tab.current', hostname: 'host' },
        }),
      ),
    );
    expect(await findWebBucket()).toBe('aw-watcher-web-chrome_host');
  });

  it('findWebBucket also matches firefox/edge variants', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          'aw-watcher-web-firefox_host': { id: 'aw-watcher-web-firefox_host', client: 'aw-watcher-web-firefox', type: 'web.tab.current', hostname: 'host' },
        }),
      ),
    );
    expect(await findWebBucket()).toBe('aw-watcher-web-firefox_host');
  });

  it('findWebBucket returns null when no aw-watcher-web bucket exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})));
    expect(await findWebBucket()).toBeNull();
  });

  it('fetchWebEvents returns the event array from the AW response', async () => {
    const events = [
      {
        id: 1,
        timestamp: '2026-04-18T09:00:00.000Z',
        duration: 60,
        data: { url: 'https://github.com', title: 'GitHub' },
      },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(events)));
    const got = await fetchWebEvents(
      'aw-watcher-web-chrome_host',
      '2026-04-18T00:00:00.000Z',
      '2026-04-19T00:00:00.000Z',
    );
    expect(got).toHaveLength(1);
    expect(got[0].data.url).toBe('https://github.com');
  });
});
