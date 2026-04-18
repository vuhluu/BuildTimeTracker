export type AWEvent = {
  id: number;
  timestamp: string;
  duration: number;
  data: { app: string; title?: string; url?: string };
};

export type TaskSession = {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  events: AWEvent[];
};

export type AppSlice = {
  app: string;
  seconds: number;
  percent: number;
};

export type Category = 'code' | 'creative' | 'comm' | 'meeting' | 'browse';

export type WebCategory =
  | 'Code'
  | 'Docs'
  | 'Work'
  | 'Comms'
  | 'News'
  | 'Social'
  | 'Entertainment'
  | 'Shopping'
  | 'AI'
  | 'Other';

export type WebEvent = {
  id?: number;
  timestamp: string;
  duration: number;
  data: { url: string; title: string; domain?: string; tabCount?: number };
};

export type WebVisit = {
  timestamp: string;
  domain: string;
  url: string;
  title: string;
  duration: number;
};

export type DomainMeta = { cat: WebCategory; favicon: string };

export type Settings = {
  bucketId: string | null;
  webBucketId: string | null;
  lastError: string | null;
};
