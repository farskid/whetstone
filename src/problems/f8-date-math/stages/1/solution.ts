import type { PlainDate, Weekday } from './types';

const DAY_MS = 86_400_000;

/** Days since 1970-01-01 for a valid plain date. */
function toDays(date: PlainDate): number {
  const m = typeof date === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  if (!m) throw new RangeError(`Not a YYYY-MM-DD date: ${String(date)}`);
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) throw new RangeError(`Invalid date: ${date}`);
  return Date.UTC(y, mo - 1, d) / DAY_MS;
}

function fromDays(days: number): PlainDate {
  return new Date(days * DAY_MS).toISOString().slice(0, 10);
}

function ymd(date: PlainDate): [number, number, number] {
  toDays(date);
  return date.split('-').map(Number) as [number, number, number];
}

function pad(y: number, m: number, d: number): PlainDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function int(n: number, name = 'amount'): number {
  if (!Number.isInteger(n)) throw new RangeError(`${name} must be an integer, got ${n}`);
  return n;
}

const weekdayOfDays = (days: number) => (((days + 4) % 7) + 7) % 7 as Weekday; // 1970-01-01 was a Thursday

export function getDay(date: PlainDate): Weekday {
  return weekdayOfDays(toDays(date));
}

export function addDays(date: PlainDate, amount: number): PlainDate {
  return fromDays(toDays(date) + int(amount));
}

export function addMonths(date: PlainDate, amount: number): PlainDate {
  const [y, m, d] = ymd(date);
  const total = y * 12 + (m - 1) + int(amount);
  const ny = Math.floor(total / 12), nm = total - ny * 12 + 1;
  return pad(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function startOfWeek(date: PlainDate, weekStartsOn: Weekday = 0): PlainDate {
  const days = toDays(date);
  return fromDays(days - ((weekdayOfDays(days) - weekStartsOn + 7) % 7));
}
