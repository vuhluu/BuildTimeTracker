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
  appOrder?: string[];
};

export type AppSlice = {
  app: string;
  seconds: number;
  percent: number;
};

export type Settings = {
  bucketId: string | null;
  lastError: string | null;
};
