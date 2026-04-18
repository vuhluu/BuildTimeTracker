import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, Settings, TaskSession } from '../types';
import {
  ActivityWatchError,
  fetchEvents,
  findWebBucket,
  findWindowBucket,
} from '../lib/activitywatch';

type StoreState = {
  sessions: TaskSession[];
  activeSessionId: string | null;
  settings: Settings;
  categoryOverrides: Record<string, Category>;
  startTask: (name: string) => Promise<void>;
  stopActive: () => Promise<void>;
  renameSession: (id: string, name: string) => void;
  refreshBucket: () => Promise<void>;
  refreshWebBucket: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
};

const DEFAULT_SETTINGS: Settings = {
  bucketId: null,
  webBucketId: null,
  lastError: null,
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
      settings: DEFAULT_SETTINGS,
      categoryOverrides: {},

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

      renameSession(id, name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, name: trimmed } : sess,
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

      async refreshWebBucket() {
        try {
          const webBucketId = await findWebBucket();
          set((s) => ({
            settings: { ...s.settings, webBucketId },
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

      clearError() {
        set((s) => ({ settings: { ...s.settings, lastError: null } }));
      },

      reset() {
        set({
          sessions: [],
          activeSessionId: null,
          settings: DEFAULT_SETTINGS,
          categoryOverrides: {},
        });
      },
    }),
    {
      name: 'buildtimetracker:v1',
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        settings: state.settings,
        categoryOverrides: state.categoryOverrides,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          categoryOverrides: p.categoryOverrides ?? {},
        };
      },
    },
  ),
);
