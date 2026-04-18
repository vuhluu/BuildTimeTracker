import { describe, it, expect } from 'vitest';
import { formatDurationShort } from '../../lib/time';

describe('formatDurationShort', () => {
  it('formats sub-minute as seconds', () => {
    expect(formatDurationShort(0)).toBe('0s');
    expect(formatDurationShort(42)).toBe('42s');
  });
  it('formats minutes', () => {
    expect(formatDurationShort(60)).toBe('1m');
    expect(formatDurationShort(30 * 60)).toBe('30m');
  });
  it('formats hours with remaining minutes', () => {
    expect(formatDurationShort(3600)).toBe('1h 0m');
    expect(formatDurationShort(3600 + 28 * 60)).toBe('1h 28m');
    expect(formatDurationShort(2 * 3600 + 5 * 60)).toBe('2h 5m');
  });
  it('clamps negatives to 0s', () => {
    expect(formatDurationShort(-5)).toBe('0s');
  });
});
