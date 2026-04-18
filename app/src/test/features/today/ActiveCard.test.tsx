import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveCard } from '../../../features/today/ActiveCard';
import { useStore } from '../../../store/useStore';
import type { TaskSession } from '../../../types';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

function activeSession(): TaskSession {
  return {
    id: 'active',
    name: 'Write release notes',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    endedAt: null,
    events: [],
  };
}

describe('ActiveCard — idle state', () => {
  it('renders the input and start button when no active session', () => {
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    expect(
      screen.getByPlaceholderText(/what are you working on/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start task/i })).toBeInTheDocument();
  });

  it('renders up to five Recent chips', () => {
    render(
      <ActiveCard
        activeSession={null}
        onInspect={() => {}}
        recents={['A', 'B', 'C', 'D', 'E', 'F']}
      />,
    );
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBe(6);
  });

  it('calls startTask on Enter in the input', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    const input = screen.getByPlaceholderText(/what are you working on/i);
    await user.type(input, 'New thing{Enter}');
    expect(spy).toHaveBeenCalledWith('New thing');
  });

  it('calls startTask when a Recent chip is clicked', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(
      <ActiveCard
        activeSession={null}
        onInspect={() => {}}
        recents={['Morning review', 'Fix bug']}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Morning review' }));
    expect(spy).toHaveBeenCalledWith('Morning review');
  });

  it('ignores empty or whitespace-only Enter', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    useStore.setState({ startTask: spy });
    render(<ActiveCard activeSession={null} onInspect={() => {}} recents={[]} />);
    const input = screen.getByPlaceholderText(/what are you working on/i);
    await user.type(input, '   {Enter}');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('ActiveCard — running state', () => {
  it('renders task name, Stop, and Inspect buttons', () => {
    render(
      <ActiveCard
        activeSession={activeSession()}
        onInspect={() => {}}
        recents={[]}
      />,
    );
    expect(screen.getByText('Write release notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inspect/i })).toBeInTheDocument();
  });

  it('Inspect fires onInspect with session.id', async () => {
    const user = userEvent.setup();
    const onInspect = vi.fn();
    render(
      <ActiveCard activeSession={activeSession()} onInspect={onInspect} recents={[]} />,
    );
    await user.click(screen.getByRole('button', { name: /inspect/i }));
    expect(onInspect).toHaveBeenCalledWith('active');
  });

  it('shows a running timer', () => {
    render(
      <ActiveCard activeSession={activeSession()} onInspect={() => {}} recents={[]} />,
    );
    const timer = screen.getByTestId('active-timer');
    expect(timer.textContent).toMatch(/\d+:\d{2}/);
  });
});
