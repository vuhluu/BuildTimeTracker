import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeekPage } from '../../../features/week/WeekPage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  vi.spyOn(Date, 'now').mockReturnValue(
    new Date(2026, 3, 18, 12, 0, 0).getTime(),
  );
});

describe('WeekPage', () => {
  it('renders the week header and three summary stats', () => {
    render(
      <MemoryRouter>
        <WeekPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByText(/Total tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Tasks completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg focus/i)).toBeInTheDocument();
  });

  it('renders the shipped-list empty state when no completed tasks', () => {
    render(
      <MemoryRouter>
        <WeekPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Nothing shipped yet/i)).toBeInTheDocument();
  });
});
