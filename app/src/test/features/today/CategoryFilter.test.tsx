import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilter } from '../../../features/today/CategoryFilter';

describe('CategoryFilter', () => {
  it('renders All plus chips for present categories', () => {
    render(
      <CategoryFilter
        totals={new Map([
          ['code', 3600],
          ['comm', 1200],
        ])}
        value="all"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comm/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /creative/i }),
    ).not.toBeInTheDocument();
  });

  it('marks the active chip with aria-pressed', () => {
    render(
      <CategoryFilter
        totals={new Map([['code', 100]])}
        value="code"
        onChange={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: /code/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'All' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CategoryFilter
        totals={new Map([['meeting', 100]])}
        value="all"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /meeting/i }));
    expect(onChange).toHaveBeenCalledWith('meeting');
  });
});
