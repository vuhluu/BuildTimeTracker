import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilmStrip } from '../../../features/today/FilmStrip';
import type { TaskSession } from '../../../types';

const NOW = Date.parse('2026-04-18T17:00:00.000Z');

function makeSessions(): TaskSession[] {
  return [
    {
      id: 's1',
      name: 'Morning review',
      startedAt: '2026-04-18T09:12:00.000Z',
      endedAt: '2026-04-18T09:47:00.000Z',
      events: [
        {
          id: 1,
          timestamp: '2026-04-18T09:12:00.000Z',
          duration: 35 * 60,
          data: { app: 'Linear', title: 'Inbox' },
        },
      ],
    },
    {
      id: 's2',
      name: 'Fix bug',
      startedAt: '2026-04-18T10:00:00.000Z',
      endedAt: '2026-04-18T11:00:00.000Z',
      events: [
        {
          id: 2,
          timestamp: '2026-04-18T10:00:00.000Z',
          duration: 3600,
          data: { app: 'VS Code', title: 'file.ts' },
        },
      ],
    },
  ];
}

describe('FilmStrip', () => {
  it('renders a labelled day range', () => {
    render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={() => {}} />,
    );
    expect(screen.getByText(/Day at a glance/i)).toBeInTheDocument();
  });

  it('renders a segment per event', () => {
    const { container } = render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={() => {}} />,
    );
    const segs = container.querySelectorAll('[data-filmstrip-seg]');
    expect(segs.length).toBe(2);
  });

  it('fires onSelect with session id when a segment is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { container } = render(
      <FilmStrip sessions={makeSessions()} nowMs={NOW} onSelect={onSelect} />,
    );
    const segs = container.querySelectorAll('[data-filmstrip-seg]');
    await user.click(segs[0] as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith('s1');
  });

  it('renders an empty strip when no sessions', () => {
    render(<FilmStrip sessions={[]} nowMs={NOW} onSelect={() => {}} />);
    expect(screen.getByText(/nothing tracked yet/i)).toBeInTheDocument();
  });
});
