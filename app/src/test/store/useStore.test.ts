import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('renameSession', () => {
  it('updates the session name', async () => {
    await useStore.getState().startTask('Original');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, 'Renamed');
    const session = useStore.getState().sessions.find((s) => s.id === id)!;
    expect(session.name).toBe('Renamed');
  });

  it('trims whitespace', async () => {
    await useStore.getState().startTask('Task');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, '  Trimmed  ');
    expect(useStore.getState().sessions.find((s) => s.id === id)!.name).toBe('Trimmed');
  });

  it('is a no-op on empty or whitespace-only names', async () => {
    await useStore.getState().startTask('Keep');
    const id = useStore.getState().activeSessionId!;
    useStore.getState().renameSession(id, '   ');
    expect(useStore.getState().sessions.find((s) => s.id === id)!.name).toBe('Keep');
  });

  it('is a no-op on unknown id', async () => {
    await useStore.getState().startTask('Keep');
    useStore.getState().renameSession('nonexistent', 'Whatever');
    expect(useStore.getState().sessions[0].name).toBe('Keep');
  });
});

describe('settings.webBucketId', () => {
  it('defaults to null', () => {
    expect(useStore.getState().settings.webBucketId).toBeNull();
  });
});

describe('categoryOverrides', () => {
  it('defaults to an empty object', () => {
    expect(useStore.getState().categoryOverrides).toEqual({});
  });
});

describe('removed actions', () => {
  it('does not expose setAppOrder', () => {
    expect((useStore.getState() as Record<string, unknown>).setAppOrder).toBeUndefined();
  });
  it('does not expose importJson / exportJson', () => {
    expect((useStore.getState() as Record<string, unknown>).importJson).toBeUndefined();
    expect((useStore.getState() as Record<string, unknown>).exportJson).toBeUndefined();
  });
});
