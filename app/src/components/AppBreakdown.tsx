import { useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TaskSession } from '../types';
import { applyCustomOrder, groupByApp } from '../lib/aggregation';
import { appColor } from '../lib/colors';
import { formatDuration } from '../lib/time';
import { useStore } from '../store/useStore';

type Props = {
  session: TaskSession;
  compact?: boolean;
};

export function AppBreakdown({ session, compact = false }: Props) {
  const setAppOrder = useStore((s) => s.setAppOrder);
  const slices = useMemo(() => {
    const endedAt = session.endedAt ?? new Date().toISOString();
    const raw = groupByApp(session.events, session.startedAt, endedAt);
    return applyCustomOrder(raw, session.appOrder);
  }, [session.events, session.startedAt, session.endedAt, session.appOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (slices.length === 0) {
    return (
      <div className="mt-2 text-sm text-neutral-500">No app events.</div>
    );
  }

  const items = slices.map((s) => s.app);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.indexOf(active.id as string);
    const newIndex = items.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setAppOrder(session.id, next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ul
          aria-label={`App breakdown for ${session.name}`}
          className={compact ? 'space-y-1' : 'space-y-2'}
        >
          {slices.map((s) => (
            <SortableRow
              key={s.app}
              id={s.app}
              app={s.app}
              seconds={s.seconds}
              percent={s.percent}
              compact={compact}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

type RowProps = {
  id: string;
  app: string;
  seconds: number;
  percent: number;
  compact: boolean;
};

function SortableRow({ id, app, seconds, percent, compact }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      title={`Drag to reorder ${app}`}
      data-testid={`breakdown-row-${app}`}
      className={`grid select-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-neutral-800 bg-neutral-900/60 outline-none hover:border-neutral-600 hover:bg-neutral-900 focus-visible:border-emerald-500 ${compact ? 'px-2 py-1' : 'px-3 py-2'} ${isDragging ? 'cursor-grabbing shadow-lg' : 'cursor-grab'}`}
      {...attributes}
      {...listeners}
    >
      <span
        aria-hidden="true"
        className="text-neutral-500"
      >
        ⋮⋮
      </span>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-neutral-200">{app}</span>
          <span className="text-xs text-neutral-400">
            {percent.toFixed(0)}%
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded bg-neutral-800">
          <div
            className="h-full rounded"
            style={{
              width: `${Math.max(1, percent)}%`,
              backgroundColor: appColor(app),
            }}
          />
        </div>
      </div>
      <span className="font-mono text-xs tabular-nums text-neutral-400">
        {formatDuration(seconds)}
      </span>
    </li>
  );
}
