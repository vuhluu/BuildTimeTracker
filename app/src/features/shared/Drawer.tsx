import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ open, onClose, children }: DrawerProps) {
  return createPortal(
    <>
      <div
        data-testid="drawer-scrim"
        className={[
          'fixed inset-0 z-50 transition-opacity duration-300',
          'bg-black/50 backdrop-blur-[2px]',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-hidden={!open}
        className={[
          'fixed top-0 right-0 bottom-0 z-[60] flex flex-col',
          'w-[520px] max-w-[92vw] bg-[#0a0b0e] border-l border-line-2',
          'shadow-[-24px_0_64px_rgba(0,0,0,0.4)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {children}
      </aside>
    </>,
    document.body,
  );
}
