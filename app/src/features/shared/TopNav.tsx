import { NavLink } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const TABS = [
  { to: '/today', label: 'Today' },
  { to: '/week', label: 'Week' },
  { to: '/aggregate', label: 'Aggregate' },
  { to: '/web', label: 'Web' },
];

type DotState = 'idle' | 'connected' | 'error';

function awStatus(
  bucketId: string | null,
  lastError: string | null,
): { state: DotState; label: string } {
  if (lastError) return { state: 'error', label: lastError };
  if (bucketId) return { state: 'connected', label: 'ActivityWatch connected' };
  return { state: 'idle', label: 'ActivityWatch not yet checked' };
}

export function TopNav() {
  const bucketId = useStore((s) => s.settings.bucketId);
  const lastError = useStore((s) => s.settings.lastError);
  const status = awStatus(bucketId, lastError);

  return (
    <header className="max-w-[1240px] mx-auto px-8 py-5 flex items-center gap-4 border-b border-line">
      <div className="flex items-center gap-2.5 font-semibold tracking-tight text-[15px]">
        <span
          aria-hidden
          className="w-[22px] h-[22px] rounded-md bg-gradient-to-br from-accent to-[#c084fc]"
        />
        <span>BuildTimeTracker</span>
      </div>

      <nav className="flex gap-0.5 p-[3px] bg-bg-1 border border-line rounded-full ml-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              [
                'px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-bg-3 text-ink shadow-[inset_0_0_0_1px_#2d323c]'
                  : 'text-muted hover:text-ink-2',
              ].join(' ')
            }
            end
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs text-muted border border-line rounded-full"
          title={status.label}
        >
          <span
            data-testid="aw-status-dot"
            data-state={status.state}
            className={[
              'w-1.5 h-1.5 rounded-full',
              status.state === 'connected'
                ? 'bg-good shadow-[0_0_0_3px_rgba(110,231,167,0.12)]'
                : status.state === 'error'
                  ? 'bg-bad shadow-[0_0_0_3px_rgba(248,113,113,0.12)]'
                  : 'bg-muted-2',
            ].join(' ')}
          />
          <span>
            {status.state === 'connected'
              ? 'ActivityWatch connected'
              : status.state === 'error'
                ? 'ActivityWatch error'
                : 'Not connected'}
          </span>
        </span>
      </div>
    </header>
  );
}
