import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv } from '../../lib/csv';

describe('escapeCsvCell', () => {
  it('leaves plain values unchanged', () => {
    expect(escapeCsvCell('task one')).toBe('task one');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('quotes and escapes commas, quotes, and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell('a\nb')).toBe('"a\nb"');
  });
});

describe('toCsv', () => {
  it('produces a header row and data rows', () => {
    const csv = toCsv(
      ['task', 'seconds'],
      [
        ['deep work', 1800],
        ['email, review', 600],
      ],
    );
    expect(csv).toBe(
      'task,seconds\ndeep work,1800\n"email, review",600',
    );
  });
});
