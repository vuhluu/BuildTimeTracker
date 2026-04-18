import type { Category } from '../../types';

export type FilterValue = 'all' | Category;

const ORDER: Category[] = ['code', 'creative', 'comm', 'meeting', 'browse'];

const CATEGORY_COLOR: Record<Category, string> = {
  code: '#7AA2F7',
  creative: '#E879F9',
  comm: '#F59E0B',
  meeting: '#38BDF8',
  browse: '#94A3B8',
};

export type CategoryFilterProps = {
  totals: Map<Category, number>;
  value: FilterValue;
  onChange: (next: FilterValue) => void;
};

export function CategoryFilter({ totals, value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-0.5">
      <button
        className={chipClass(value === 'all')}
        aria-pressed={value === 'all'}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {ORDER.map((c) => {
        if ((totals.get(c) ?? 0) <= 0) return null;
        const active = value === c;
        return (
          <button
            key={c}
            className={chipClass(active)}
            aria-pressed={active}
            onClick={() => onChange(c)}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: CATEGORY_COLOR[c] }}
              aria-hidden
            />
            <span className="capitalize">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

function chipClass(active: boolean): string {
  return [
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs',
    active
      ? 'bg-bg-3 text-ink'
      : 'text-muted hover:bg-bg-2 hover:text-ink-2',
  ].join(' ');
}
