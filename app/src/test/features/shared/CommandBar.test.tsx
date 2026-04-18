import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommandBar } from '../../../features/shared/CommandBar';
import { useStore } from '../../../store/useStore';

function renderCmd(props: Partial<Parameters<typeof CommandBar>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CommandBar
        open={true}
        onClose={() => {}}
        onPickTask={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe('CommandBar', () => {
  it('shows view-jump items always', () => {
    renderCmd();
    expect(screen.getByText('Open Today')).toBeInTheDocument();
    expect(screen.getByText('Open Week')).toBeInTheDocument();
    expect(screen.getByText('Open Aggregate')).toBeInTheDocument();
    expect(screen.getByText('Open Web')).toBeInTheDocument();
  });

  it('shows task items from the store', async () => {
    await useStore.getState().startTask('First task');
    await useStore.getState().startTask('Second task');
    renderCmd();
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
  });

  it('filters items as the user types', async () => {
    const user = userEvent.setup();
    await useStore.getState().startTask('Fix timer drift');
    renderCmd();
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'timer');
    expect(screen.getByText('Fix timer drift')).toBeInTheDocument();
    expect(screen.queryByText('Open Today')).not.toBeInTheDocument();
  });

  it('fires onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderCmd({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('renders no-matches hint when no item matches', async () => {
    const user = userEvent.setup();
    renderCmd();
    const input = screen.getByPlaceholderText(/Type a command/i);
    await user.type(input, 'zzzzz');
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
  });

  it('returns null when open is false', () => {
    const { container } = render(
      <MemoryRouter>
        <CommandBar open={false} onClose={() => {}} onPickTask={() => {}} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
