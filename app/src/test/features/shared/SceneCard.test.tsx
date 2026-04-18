import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneCard } from '../../../features/shared/SceneCard';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeSession(): TaskSession {
  return {
    id: 's1',
    name: 'Fix timer drift bug',
    startedAt: '2026-04-18T09:50:00.000Z',
    endedAt: '2026-04-18T11:18:00.000Z',
    events: [
      {
        id: 1,
        timestamp: '2026-04-18T09:50:00.000Z',
        duration: 1320,
        data: { app: 'VS Code', title: 'useStore.ts' },
      },
      {
        id: 2,
        timestamp: '2026-04-18T10:12:00.000Z',
        duration: 240,
        data: { app: 'Chrome', title: 'MDN' },
      },
    ],
  };
}

describe('SceneCard', () => {
  it('renders the session name and scene index', () => {
    render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Fix timer drift bug')).toBeInTheDocument();
    expect(screen.getByText(/Scene 01/)).toBeInTheDocument();
  });

  it('renders duration', () => {
    render(
      <SceneCard
        session={makeSession()}
        index={2}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText(/1h 28m|88m/)).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={onClick}
      />,
    );
    await user.click(screen.getByText('Fix timer drift bug'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the "selected" data attribute when selected', () => {
    const { container } = render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={true}
        onClick={() => {}}
      />,
    );
    const li = container.querySelector('li')!;
    expect(li.dataset.selected).toBe('true');
  });

  it('carries data-scene-id for keyboard nav', () => {
    const { container } = render(
      <SceneCard
        session={makeSession()}
        index={0}
        nowMs={NOW}
        selected={false}
        onClick={() => {}}
      />,
    );
    const li = container.querySelector('li')!;
    expect(li.dataset.sceneId).toBe('s1');
  });
});
