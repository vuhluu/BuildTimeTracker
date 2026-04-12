import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AggregatedView } from '../../components/AggregatedView';
import { useStore } from '../../store/useStore';
import type { TaskSession } from '../../types';
import { toDateTimeLocalValue } from '../../lib/time';

function session(
  id: string,
  name: string,
  startISO: string,
  endISO: string,
  events: TaskSession['events'] = [],
): TaskSession {
  return { id, name, startedAt: startISO, endedAt: endISO, events };
}

beforeEach(() => {
  useStore.setState({
    sessions: [
      session(
        's1',
        'deep work',
        '2026-04-11T09:00:00.000Z',
        '2026-04-11T10:00:00.000Z',
        [
          {
            id: 1,
            timestamp: '2026-04-11T09:00:00.000Z',
            duration: 2400,
            data: { app: 'Code' },
          },
          {
            id: 2,
            timestamp: '2026-04-11T09:40:00.000Z',
            duration: 1200,
            data: { app: 'Safari' },
          },
        ],
      ),
      session(
        's2',
        'deep work',
        '2026-04-11T11:00:00.000Z',
        '2026-04-11T11:30:00.000Z',
        [
          {
            id: 3,
            timestamp: '2026-04-11T11:00:00.000Z',
            duration: 1800,
            data: { app: 'Code' },
          },
        ],
      ),
      session(
        's3',
        'email triage',
        '2026-04-11T12:00:00.000Z',
        '2026-04-11T12:15:00.000Z',
        [
          {
            id: 4,
            timestamp: '2026-04-11T12:00:00.000Z',
            duration: 900,
            data: { app: 'Mail' },
          },
        ],
      ),
    ],
    activeSessionId: null,
    settings: { bucketId: null, lastError: null },
  });
});

describe('AggregatedView', () => {
  it('aggregates sessions by task name and sorts by total desc', async () => {
    // set a wide range that covers all test data
    render(<AggregatedView />);
    const user = userEvent.setup();
    const startInput = screen.getByLabelText('Range start') as HTMLInputElement;
    const endInput = screen.getByLabelText('Range end') as HTMLInputElement;
    await user.clear(startInput);
    await user.type(
      startInput,
      toDateTimeLocalValue(new Date('2026-04-11T08:00:00.000Z')),
    );
    await user.clear(endInput);
    await user.type(
      endInput,
      toDateTimeLocalValue(new Date('2026-04-11T13:00:00.000Z')),
    );

    const list = screen.getByLabelText('Aggregated task totals');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    // deep work (1hr + 30min = 5400s) > email triage (900s)
    expect(rows[0]).toHaveTextContent('deep work');
    expect(rows[1]).toHaveTextContent('email triage');
    expect(rows[0]).toHaveTextContent('1:30:00');
    expect(rows[0]).toHaveTextContent('2×');
  });

  it('filters by task name when one is selected', async () => {
    render(<AggregatedView />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Range start'));
    await user.type(
      screen.getByLabelText('Range start'),
      toDateTimeLocalValue(new Date('2026-04-11T08:00:00.000Z')),
    );
    await user.clear(screen.getByLabelText('Range end'));
    await user.type(
      screen.getByLabelText('Range end'),
      toDateTimeLocalValue(new Date('2026-04-11T13:00:00.000Z')),
    );
    await user.selectOptions(
      screen.getByLabelText('Task filter'),
      'email triage',
    );
    const list = screen.getByLabelText('Aggregated task totals');
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('email triage');
  });

  it('exports a CSV blob with expected columns and rows', async () => {
    const createSpy = vi.fn(() => 'blob:mock');
    const revokeSpy = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).createObjectURL = createSpy;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (URL as any).revokeObjectURL = revokeSpy;
    let capturedCsv = '';
    const origBlob = globalThis.Blob;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Blob = class extends origBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        capturedCsv = parts
          .map((p) => (typeof p === 'string' ? p : ''))
          .join('');
      }
    };
    try {
      render(<AggregatedView />);
      const user = userEvent.setup();
      await user.clear(screen.getByLabelText('Range start'));
      await user.type(
        screen.getByLabelText('Range start'),
        toDateTimeLocalValue(new Date('2026-04-11T08:00:00.000Z')),
      );
      await user.clear(screen.getByLabelText('Range end'));
      await user.type(
        screen.getByLabelText('Range end'),
        toDateTimeLocalValue(new Date('2026-04-11T13:00:00.000Z')),
      );
      await user.click(screen.getByRole('button', { name: 'Export CSV' }));
      expect(capturedCsv.startsWith('Task,Total,Sessions,Avg session,')).toBe(
        true,
      );
      expect(capturedCsv).toContain('deep work');
      expect(capturedCsv).toContain('email triage');
      expect(createSpy).toHaveBeenCalled();
      expect(revokeSpy).toHaveBeenCalled();
    } finally {
      globalThis.Blob = origBlob;
    }
  });
});

