import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneRibbon } from '../../../features/shared/SceneRibbon';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function s(id: string, name: string, startedAt: string, endedAt: string | null): TaskSession {
  return { id, name, startedAt, endedAt, events: [] };
}

describe('SceneRibbon', () => {
  it('renders one SceneCard per session', () => {
    const sessions = [
      s('a', 'Task A', '2026-04-18T09:00:00.000Z', '2026-04-18T10:00:00.000Z'),
      s('b', 'Task B', '2026-04-18T10:30:00.000Z', '2026-04-18T11:30:00.000Z'),
    ];
    render(
      <SceneRibbon
        sessions={sessions}
        selectedId={null}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
  });

  it('renders empty-state message when no sessions', () => {
    render(
      <SceneRibbon
        sessions={[]}
        selectedId={null}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    expect(screen.getByText(/No tasks yet/i)).toBeInTheDocument();
  });

  it('passes `selected` prop to matching card', () => {
    const sessions = [
      s('a', 'Task A', '2026-04-18T09:00:00.000Z', '2026-04-18T10:00:00.000Z'),
      s('b', 'Task B', '2026-04-18T10:30:00.000Z', '2026-04-18T11:30:00.000Z'),
    ];
    const { container } = render(
      <SceneRibbon
        sessions={sessions}
        selectedId={'b'}
        onSelect={() => {}}
        nowMs={NOW}
      />,
    );
    const items = container.querySelectorAll('li');
    expect(items[0].dataset.selected).toBe('false');
    expect(items[1].dataset.selected).toBe('true');
  });
});
