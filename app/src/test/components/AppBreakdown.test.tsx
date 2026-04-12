import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppBreakdown } from '../../components/AppBreakdown';
import { useStore } from '../../store/useStore';
import type { TaskSession } from '../../types';

function makeSession(): TaskSession {
  return {
    id: 'session-1',
    name: 'deep work',
    startedAt: '2026-04-11T10:00:00.000Z',
    endedAt: '2026-04-11T10:30:00.000Z',
    events: [
      {
        id: 1,
        timestamp: '2026-04-11T10:00:00.000Z',
        duration: 900,
        data: { app: 'Code' },
      },
      {
        id: 2,
        timestamp: '2026-04-11T10:15:00.000Z',
        duration: 600,
        data: { app: 'Safari' },
      },
      {
        id: 3,
        timestamp: '2026-04-11T10:25:00.000Z',
        duration: 300,
        data: { app: 'Slack' },
      },
    ],
  };
}

beforeEach(() => {
  useStore.setState({
    sessions: [makeSession()],
    activeSessionId: null,
    settings: { bucketId: null, lastError: null },
  });
});

function getRowsInOrder(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid^="breakdown-row-"]'),
  );
}

describe('AppBreakdown', () => {
  it('renders one row per app, ordered by duration desc', () => {
    render(<AppBreakdown session={useStore.getState().sessions[0]} />);
    const rows = getRowsInOrder();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('Code');
    expect(rows[1]).toHaveTextContent('Safari');
    expect(rows[2]).toHaveTextContent('Slack');
  });

  it('applies custom appOrder from store', () => {
    useStore.setState((s) => ({
      sessions: s.sessions.map((sess) => ({
        ...sess,
        appOrder: ['Slack', 'Safari', 'Code'],
      })),
    }));
    render(<AppBreakdown session={useStore.getState().sessions[0]} />);
    const rows = getRowsInOrder();
    expect(rows[0]).toHaveTextContent('Slack');
    expect(rows[1]).toHaveTextContent('Safari');
    expect(rows[2]).toHaveTextContent('Code');
  });

  it('reorders via keyboard dnd and persists the new order', async () => {
    const user = userEvent.setup();
    render(<AppBreakdown session={useStore.getState().sessions[0]} />);
    const slackRow = screen.getByTestId('breakdown-row-Slack');
    slackRow.focus();
    // pick up, move up twice, drop
    await user.keyboard('[Space]');
    await user.keyboard('[ArrowUp]');
    await user.keyboard('[ArrowUp]');
    await user.keyboard('[Space]');

    const order = useStore.getState().sessions[0].appOrder;
    expect(order).toEqual(['Slack', 'Code', 'Safari']);
  });
});
