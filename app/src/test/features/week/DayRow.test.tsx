import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DayRow } from '../../../features/week/DayRow';
import type { TaskSession } from '../../../types';

function session(
  id: string,
  name: string,
  startedAt: string,
  endedAt: string | null,
  app = 'VS Code',
): TaskSession {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : start + 3600000;
  return {
    id,
    name,
    startedAt,
    endedAt,
    events: [
      {
        id: 1,
        timestamp: startedAt,
        duration: Math.max(1, (end - start) / 1000),
        data: { app, title: name },
      },
    ],
  };
}

describe('DayRow', () => {
  it('renders the day name and short date', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Apr 15')).toBeInTheDocument();
  });

  it('renders "No sessions" when sessions is empty', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText(/No sessions/i)).toBeInTheDocument();
  });

  it('fires onHover when a segment is hovered', async () => {
    const user = userEvent.setup();
    const onHover = vi.fn();
    const s = session('s1', 'Task', '2026-04-15T10:00:00.000Z', '2026-04-15T11:00:00.000Z');
    const { container } = render(
      <DayRow
        day={{
          date: new Date(2026, 3, 15),
          key: '2026-04-15',
          name: 'Wed',
          shortDate: 'Apr 15',
        }}
        sessions={[s]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={false}
        hoveredTaskId={null}
        onHover={onHover}
        focusScore={0.6}
        totalSec={3600}
      />,
    );
    const seg = container.querySelector('[data-seg]')!;
    await user.hover(seg as HTMLElement);
    expect(onHover).toHaveBeenCalledWith('s1');
  });

  it('renders the "Today" label when isToday is true', () => {
    render(
      <DayRow
        day={{
          date: new Date(2026, 3, 18),
          key: '2026-04-18',
          name: 'Sat',
          shortDate: 'Apr 18',
        }}
        sessions={[]}
        nowMs={Date.parse('2026-04-18T17:00:00.000Z')}
        isToday={true}
        hoveredTaskId={null}
        onHover={() => {}}
        focusScore={null}
        totalSec={0}
      />,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });
});
