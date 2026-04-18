import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TodayPage } from '../../../features/today/TodayPage';
import { useStore } from '../../../store/useStore';

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/today']}>
      <TodayPage />
    </MemoryRouter>,
  );
}

describe('TodayPage', () => {
  it('renders the day header', () => {
    renderPage();
    expect(screen.getByText(/Your day, so far/i)).toBeInTheDocument();
  });

  it('renders the ActiveCard idle input when no active session', () => {
    renderPage();
    expect(
      screen.getByPlaceholderText(/what are you working on/i),
    ).toBeInTheDocument();
  });

  it('shows an active ActiveCard when a session is running', async () => {
    await useStore.getState().startTask('Deep work');
    renderPage();
    // Multiple "Deep work" may render (active card + cmd bar task list), so check count-safe
    expect(screen.getAllByText('Deep work').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('opens the command bar on Ctrl+K', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
  });

  it('closes the command bar on Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText(/Type a command/i)).not.toBeInTheDocument();
  });

  it('does not hijack j/k when an input is focused', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByPlaceholderText(/what are you working on/i);
    input.focus();
    await user.keyboard('j');
    expect((input as HTMLInputElement).value).toBe('j');
  });
});
