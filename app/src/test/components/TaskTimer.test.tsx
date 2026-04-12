import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskTimer } from '../../components/TaskTimer';
import { useStore } from '../../store/useStore';

vi.mock('../../lib/activitywatch', () => ({
  ActivityWatchError: class extends Error {},
  findWindowBucket: vi.fn().mockResolvedValue('aw-watcher-window_test'),
  fetchEvents: vi.fn().mockResolvedValue([
    {
      id: 1,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      duration: 30,
      data: { app: 'Code' },
    },
  ]),
  listBuckets: vi.fn(),
}));

beforeEach(() => {
  useStore.setState({
    sessions: [],
    activeSessionId: null,
    settings: { bucketId: null, lastError: null },
  });
});

describe('TaskTimer', () => {
  it('starts a task when typing a name and clicking Start', async () => {
    const user = userEvent.setup();
    render(<TaskTimer />);
    await user.type(screen.getByLabelText('Task name'), 'deep work');
    await user.click(screen.getByRole('button', { name: 'Start' }));

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].name).toBe('deep work');
    expect(state.activeSessionId).toBe(state.sessions[0].id);
    expect(screen.getByLabelText('Elapsed time')).toBeInTheDocument();
  });

  it('auto-stops the previous task when starting a new one', async () => {
    const user = userEvent.setup();
    render(<TaskTimer />);
    await user.type(screen.getByLabelText('Task name'), 'task one');
    await user.click(screen.getByRole('button', { name: 'Start' }));
    await user.type(screen.getByLabelText('Task name'), 'task two');
    await user.click(screen.getByRole('button', { name: 'Start' }));

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(2);
    expect(state.sessions[0].endedAt).not.toBeNull();
    expect(state.sessions[0].events.length).toBeGreaterThan(0);
    expect(state.sessions[1].name).toBe('task two');
    expect(state.activeSessionId).toBe(state.sessions[1].id);
  });

  it('resumes a task when clicking a recent tasks chip', async () => {
    const user = userEvent.setup();
    useStore.setState({
      sessions: [
        {
          id: 'prev',
          name: 'old task',
          startedAt: new Date(Date.now() - 600000).toISOString(),
          endedAt: new Date(Date.now() - 300000).toISOString(),
          events: [],
        },
      ],
    });
    render(<TaskTimer />);
    await user.click(screen.getByRole('button', { name: 'old task' }));
    const state = useStore.getState();
    const active = state.sessions.find((s) => s.id === state.activeSessionId);
    expect(active?.name).toBe('old task');
  });

  it('updates the elapsed label while a task is running', async () => {
    vi.useFakeTimers();
    try {
      useStore.setState({
        sessions: [
          {
            id: 'active',
            name: 'ticking',
            startedAt: new Date(Date.now() - 5000).toISOString(),
            endedAt: null,
            events: [],
          },
        ],
        activeSessionId: 'active',
      });
      render(<TaskTimer />);
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      const elapsed = screen.getByLabelText('Elapsed time');
      expect(elapsed.textContent).toMatch(/^0:0[5-9]$/);
    } finally {
      vi.useRealTimers();
    }
  });
});
