import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneDrawer } from '../../../features/shared/SceneDrawer';
import { useStore } from '../../../store/useStore';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function completedSession(): TaskSession {
  return {
    id: 's1',
    name: 'Fix timer drift bug',
    startedAt: '2026-04-18T09:50:00.000Z',
    endedAt: '2026-04-18T10:50:00.000Z',
    events: [
      {
        id: 1,
        timestamp: '2026-04-18T09:50:00.000Z',
        duration: 1200,
        data: { app: 'VS Code', title: 'useStore.ts' },
      },
      {
        id: 2,
        timestamp: '2026-04-18T10:10:00.000Z',
        duration: 1800,
        data: { app: 'Terminal', title: 'pnpm test' },
      },
    ],
  };
}

function activeSession(): TaskSession {
  return {
    id: 'active',
    name: 'Write release notes',
    startedAt: '2026-04-18T15:52:00.000Z',
    endedAt: null,
    events: [],
  };
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  useStore.setState({ sessions: [completedSession()] });
});

describe('SceneDrawer — completed session', () => {
  it('renders the task name and "Completed task" kicker', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('Fix timer drift bug')).toBeInTheDocument();
    expect(screen.getByText(/Completed task/i)).toBeInTheDocument();
  });

  it('shows 3 mini-stats (Switches / Longest / Top app)', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Switches/)).toBeInTheDocument();
    expect(screen.getByText(/Longest/)).toBeInTheDocument();
    expect(screen.getByText(/Top app/)).toBeInTheDocument();
  });

  it('renders an App breakdown row per app', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText('VS Code').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Terminal').length).toBeGreaterThan(0);
  });

  it('fires onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renames the session when Rename input commits on Enter', async () => {
    const user = userEvent.setup();
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByText('Rename'));
    const input = screen.getByDisplayValue('Fix timer drift bug');
    await user.clear(input);
    await user.type(input, 'New name{Enter}');
    expect(useStore.getState().sessions[0].name).toBe('New name');
  });

  it('shows a Resume button for completed sessions', () => {
    render(
      <SceneDrawer
        session={completedSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });
});

describe('SceneDrawer — active session', () => {
  it('renders the "In progress" kicker and Stop button', () => {
    render(
      <SceneDrawer
        session={activeSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    // Exact-match on kicker text to avoid matching the placeholder sentence
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop task/i })).toBeInTheDocument();
  });

  it('shows active-session placeholder (no mini-stats, no breakdown)', () => {
    render(
      <SceneDrawer
        session={activeSession()}
        nowMs={NOW}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByText(/in progress.*appear when you stop/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Switches/)).not.toBeInTheDocument();
  });
});
