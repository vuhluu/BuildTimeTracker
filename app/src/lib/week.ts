export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay();
  const diff = dow === 0 ? 6 : dow - 1;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function dayKey(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type DayEntry = {
  date: Date;
  key: string;
  name: string;
  shortDate: string;
};

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekDays(monday: Date): DayEntry[] {
  return NAMES.map((name, i) => {
    const date = addDays(monday, i);
    return {
      date,
      key: dayKey(date),
      name,
      shortDate: date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    };
  });
}
