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
  it('renders the header and 4 KPI labels', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Aggregate/i })).toBeInTheDocument();
    expect(screen.getByText(/Total tracked/i)).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Top task')).toBeInTheDocument();
  });

  it('shows an empty-state message when no sessions in range', () => {
    renderPage();
    expect(
      screen.getByText(/No sessions overlap the selected range/i),
    ).toBeInTheDocument();
  });

  it('renders preset range chips', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last 7d/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last 30d/i })).toBeInTheDocument();
  });
});
