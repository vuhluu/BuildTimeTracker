import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopNav } from '../../../features/shared/TopNav';
import { useStore } from '../../../store/useStore';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopNav />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('TopNav', () => {
  it('renders all four tab labels', () => {
    renderAt('/today');
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Aggregate')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  it('highlights the active tab for the current route', () => {
    renderAt('/week');
    const active = screen.getByRole('link', { name: 'Week' });
    expect(active).toHaveAttribute('aria-current', 'page');
  });

  it('shows the brand name', () => {
    renderAt('/today');
    expect(screen.getByText('BuildTimeTracker')).toBeInTheDocument();
  });

  it('shows a disconnected status dot when bucketId is null and lastError is null', () => {
    renderAt('/today');
    const dot = screen.getByTestId('aw-status-dot');
    expect(dot).toHaveAttribute('data-state', 'idle');
  });

  it('shows a connected dot when bucketId is set', () => {
    useStore.setState({
      settings: { bucketId: 'b1', webBucketId: null, lastError: null },
    });
    renderAt('/today');
    expect(screen.getByTestId('aw-status-dot')).toHaveAttribute(
      'data-state',
      'connected',
    );
  });

  it('shows an error dot when lastError is set', () => {
    useStore.setState({
      settings: {
        bucketId: null,
        webBucketId: null,
        lastError: 'Cannot reach AW',
      },
    });
    renderAt('/today');
    expect(screen.getByTestId('aw-status-dot')).toHaveAttribute(
      'data-state',
      'error',
    );
  });
});
