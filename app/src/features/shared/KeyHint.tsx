import type { ReactNode } from 'react';

export function KeyHint({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-3.5 right-5 z-40 text-[11px] text-muted font-mono bg-bg-1 border border-line rounded-lg px-2.5 py-1.5 opacity-85">
      {children}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#22262e] border border-line-2 text-ink-2">
      {children}
    </kbd>
  );
}
