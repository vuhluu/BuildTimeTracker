import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AggregatePage } from '../../../features/aggregate/AggregatePage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  vi.spyOn(Date, 'now').mockReturnValue(
    new Date(2026, 3, 18, 17, 0, 0).getTime(),
  );
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AggregatePage />
    </MemoryRouter>,
  );
}

describe('AggregatePage', () => {
  it('defaults to "This week in review" and renders 4 KPI labels', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /This week in review/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Total tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg focus/i)).toBeInTheDocument();
    expect(screen.getByText('Top task')).toBeInTheDocument();
    expect(screen.getByText('Top app')).toBeInTheDocument();
  });

  it('renders section headings for the richer layout', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: 'Daily totals' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Top apps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recurring tasks' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Time by task × day/i }),
    ).toBeInTheDocument();
  });

  it('renders the preset range chips', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: 'This week' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Last week' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last 7d/i })).toBeInTheDocument();
  });

  it('has a Compare vs prior toggle on by default', () => {
    renderPage();
    const checkbox = screen.getByRole('checkbox', { name: /Compare vs prior/i });
    expect(checkbox).toBeChecked();
  });
});
