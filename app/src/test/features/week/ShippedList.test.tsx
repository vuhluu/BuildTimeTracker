import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShippedList } from '../../../features/week/ShippedList';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeCompleted(id: string, name: string, startIso: string, endIso: string): TaskSession {
  return {
    id,
    name,
    startedAt: startIso,
    endedAt: endIso,
    events: [
      {
        id: 1,
        timestamp: startIso,
        duration: (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000,
        data: { app: 'VS Code', title: name },
      },
    ],
  };
}

describe('ShippedList', () => {
  it('renders empty state when no tasks', () => {
    render(<ShippedList days={[]} nowMs={NOW} hoveredTaskId={null} onHover={() => {}} />);
    expect(screen.getByText(/Nothing shipped yet/i)).toBeInTheDocument();
  });

  it('groups tasks by day and shows task counts', () => {
    render(
      <ShippedList
        days={[
          {
            day: {
              date: new Date(2026, 3, 18),
              key: '2026-04-18',
              name: 'Sat',
              shortDate: 'Apr 18',
            },
            sessions: [
              makeCompleted(
                't1',
                'Task 1',
                '2026-04-18T09:00:00.000Z',
                '2026-04-18T10:00:00.000Z',
              ),
              makeCompleted(
                't2',
                'Task 2',
                '2026-04-18T11:00:00.000Z',
                '2026-04-18T12:00:00.000Z',
              ),
            ],
            isToday: true,
          },
        ]}
        nowMs={NOW}
        hoveredTaskId={null}
        onHover={() => {}}
      />,
    );
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText(/2 tasks/)).toBeInTheDocument();
  });

  it('fires onHover when a task row is hovered', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    render(
      <ShippedList
        days={[
          {
            day: {
              date: new Date(2026, 3, 17),
              key: '2026-04-17',
              name: 'Fri',
              shortDate: 'Apr 17',
            },
            sessions: [
              makeCompleted(
                't1',
                'Ship it',
                '2026-04-17T09:00:00.000Z',
                '2026-04-17T10:00:00.000Z',
              ),
            ],
            isToday: false,
          },
        ]}
        nowMs={NOW}
        hoveredTaskId={null}
        onHover={onHover}
      />,
    );
    await user.hover(screen.getByText('Ship it'));
    expect(onHover).toHaveBeenCalledWith('t1');
  });
});
