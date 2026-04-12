import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { TaskTimer } from './components/TaskTimer';
import { TaskList } from './components/TaskList';
import { Timeline } from './components/Timeline';
import { DailySummary } from './components/DailySummary';
import { AggregatedView } from './components/AggregatedView';
import { ImportExport } from './components/ImportExport';

type Tab = 'today' | 'aggregate';

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const refreshBucket = useStore((s) => s.refreshBucket);
  const lastError = useStore((s) => s.settings.lastError);
  const clearError = useStore((s) => s.clearError);

  useEffect(() => {
    void refreshBucket();
  }, [refreshBucket]);

  return (
    <main className="mx-auto min-h-full max-w-5xl p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          BuildTimeTracker
        </h1>
        <nav className="flex gap-1 rounded-full border border-neutral-800 bg-neutral-900 p-1 text-sm">
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>
            Today
          </TabButton>
          <TabButton
            active={tab === 'aggregate'}
            onClick={() => setTab('aggregate')}
          >
            Aggregate
          </TabButton>
        </nav>
      </header>

      {lastError && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-200"
        >
          <span>
            ActivityWatch: {lastError}
          </span>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-red-300 hover:text-red-100"
          >
            dismiss
          </button>
        </div>
      )}

      {tab === 'today' ? (
        <div className="space-y-6">
          <TaskTimer />
          <TaskList />
          <Timeline />
          <DailySummary />
          <ImportExport />
        </div>
      ) : (
        <div className="space-y-6">
          <AggregatedView />
          <ImportExport />
        </div>
      )}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 transition ${
        active
          ? 'bg-emerald-600 text-white'
          : 'text-neutral-300 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
