import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from '../../../features/shared/Drawer';

describe('Drawer', () => {
  it('renders panel with aria-hidden true when closed', () => {
    render(
      <Drawer open={false} onClose={() => {}}>
        <div>panel content</div>
      </Drawer>,
    );
    const panel = screen.queryByRole('dialog', { hidden: true });
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders content when open', () => {
    render(
      <Drawer open={true} onClose={() => {}}>
        <div>panel content</div>
      </Drawer>,
    );
    expect(screen.getByText('panel content')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-hidden', 'false');
  });

  it('fires onClose when scrim is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <div>panel</div>
      </Drawer>,
    );
    await user.click(screen.getByTestId('drawer-scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClose when panel itself is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Drawer open={true} onClose={onClose}>
        <div>panel</div>
      </Drawer>,
    );
    await user.click(screen.getByText('panel'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
