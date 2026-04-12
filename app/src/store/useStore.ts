import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, TaskSession } from '../types';
import {
  ActivityWatchError,
  fetchEvents,
  findWindowBucket,
} from '../lib/activitywatch';

type StoreState = {
  sessions: TaskSession[];
  activeSessionId: string | null;
  settings: Settings;
  startTask: (name: string) => Promise<void>;
  stopActive: () => Promise<void>;
  setAppOrder: (sessionId: string, order: string[]) => void;
  refreshBucket: () => Promise<void>;
  importJson: (text: string) => void;
  exportJson: () => string;
  clearError: () => void;
  reset: () => void;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      settings: { bucketId: null, lastError: null },

      async startTask(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (get().activeSessionId) {
          await get().stopActive();
        }
        const session: TaskSession = {
          id: newId(),
          name: trimmed,
          startedAt: new Date().toISOString(),
          endedAt: null,
          events: [],
        };
        set((s) => ({
          sessions: [...s.sessions, session],
          activeSessionId: session.id,
        }));
      },

      async stopActive() {
        const state = get();
        const activeId = state.activeSessionId;
        if (!activeId) return;
        const active = state.sessions.find((s) => s.id === activeId);
        if (!active) {
          set({ activeSessionId: null });
          return;
        }
        const endedAt = new Date().toISOString();
        let bucketId = state.settings.bucketId;
        let lastError: string | null = null;
        let events: TaskSession['events'] = [];
        try {
          if (!bucketId) {
            bucketId = await findWindowBucket();
          }
          if (bucketId) {
            events = await fetchEvents(bucketId, active.startedAt, endedAt);
          } else {
            lastError = 'No aw-watcher-window bucket found';
          }
        } catch (err) {
          lastError =
            err instanceof ActivityWatchError
              ? err.message
              : (err as Error).message;
        }
        set((s) => ({
          activeSessionId: null,
          settings: { ...s.settings, bucketId, lastError },
          sessions: s.sessions.map((sess) =>
            sess.id === activeId ? { ...sess, endedAt, events } : sess,
          ),
        }));
      },

      setAppOrder(sessionId, order) {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, appOrder: order } : sess,
          ),
        }));
      },

      async refreshBucket() {
        try {
          const bucketId = await findWindowBucket();
          set((s) => ({
            settings: { ...s.settings, bucketId, lastError: null },
          }));
        } catch (err) {
          set((s) => ({
            settings: {
              ...s.settings,
              lastError:
                err instanceof ActivityWatchError
                  ? err.message
                  : (err as Error).message,
            },
          }));
        }
      },

      importJson(text) {
        const parsed = JSON.parse(text) as Partial<StoreState>;
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON: expected object');
        }
        if (!Array.isArray(parsed.sessions)) {
          throw new Error('Invalid JSON: missing sessions array');
        }
        set({
          sessions: parsed.sessions as TaskSession[],
          activeSessionId: parsed.activeSessionId ?? null,
          settings:
            parsed.settings ?? { bucketId: null, lastError: null },
        });
      },

      exportJson() {
        const { sessions, activeSessionId, settings } = get();
        return JSON.stringify(
          { sessions, activeSessionId, settings },
          null,
          2,
        );
      },

      clearError() {
        set((s) => ({ settings: { ...s.settings, lastError: null } }));
      },

      reset() {
        set({
          sessions: [],
          activeSessionId: null,
          settings: { bucketId: null, lastError: null },
        });
      },
    }),
    {
      name: 'buildtimetracker:v1',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        settings: state.settings,
      }),
    },
  ),
);
