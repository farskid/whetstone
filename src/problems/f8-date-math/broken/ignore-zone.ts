// Bug: instants are always read in UTC
/** A calendar date with no time or zone: 'YYYY-MM-DD'. */
export type PlainDate = string;
/** 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** A plain date, or an instant (Date or epoch milliseconds). */
export type DateInput = PlainDate | Date | number;

export interface RecurrenceRule {
  freq: 'daily' | 'weekly' | 'monthly';
  start: PlainDate;
  interval?: number;
  byDay?: Weekday[];
  nth?: number;
  byMonthDay?: number;
  count?: number;
  until?: PlainDate;
  weekStartsOn?: Weekday;
}

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

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The calendar date of an instant in a time zone. */
export function toPlainDate(instant: Date | number, timeZone: string = 'UTC'): PlainDate {
  const t = typeof instant === 'number' ? instant : instant.getTime();
  if (!Number.isFinite(t)) throw new RangeError('Invalid instant');
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', calendar: 'gregory', numberingSystem: 'latn' });
    formatters.set(timeZone, f);
  }
  const parts = Object.fromEntries(f.formatToParts(t).map((p) => [p.type, p.value]));
  return pad(+parts.year, +parts.month, +parts.day);
}

function inputDays(d: DateInput, timeZone: string): number {
  return toDays(typeof d === 'string' ? d : toPlainDate(d));
}

export function differenceInCalendarDays(a: DateInput, b: DateInput, timeZone: string = 'UTC'): number {
  return inputDays(a, timeZone) - inputDays(b, timeZone);
}

export function isSameDay(a: DateInput, b: DateInput, timeZone: string = 'UTC'): boolean {
  return differenceInCalendarDays(a, b, timeZone) === 0;
}

function businessCheck(holidays: PlainDate[]) {
  const set = new Set(holidays.map(toDays));
  return (days: number) => {
    const wd = weekdayOfDays(days);
    return wd !== 0 && wd !== 6 && !set.has(days);
  };
}

export function addBusinessDays(date: PlainDate, amount: number, holidays: PlainDate[] = []): PlainDate {
  let days = toDays(date);
  int(amount);
  const isBusiness = businessCheck(holidays);
  const step = amount < 0 ? -1 : 1;
  for (let left = Math.abs(amount); left > 0; ) {
    days += step;
    if (isBusiness(days)) left--;
  }
  return fromDays(days);
}

export function differenceInBusinessDays(later: PlainDate, earlier: PlainDate, holidays: PlainDate[] = []): number {
  const a = toDays(later), b = toDays(earlier);
  const isBusiness = businessCheck(holidays);
  const [lo, hi, sign] = a >= b ? [b, a, 1] : [a, b, -1];
  let n = 0;
  for (let d = lo + 1; d <= hi; d++) if (isBusiness(d)) n++;
  return sign * n;
}

export function expand(rule: RecurrenceRule, from: PlainDate, to: PlainDate): PlainDate[] {
  const start = toDays(rule.start);
  const lo = Math.max(toDays(from), start);
  let hi = toDays(to);
  if (rule.until !== undefined) hi = Math.min(hi, toDays(rule.until));
  const interval = int(rule.interval ?? 1, 'interval');
  if (interval < 1) throw new RangeError('interval must be at least 1');
  const count = rule.count ?? Infinity;
  const out: PlainDate[] = [];
  let seen = 0;
  // Visit candidates in order from the rule's start; `emit` returns false to stop.
  const emit = (days: number): boolean => {
    if (days < start) return true;
    if (days > hi || seen >= count) return false;
    seen++;
    if (days >= lo) out.push(fromDays(days));
    return true;
  };

  if (rule.freq === 'daily') {
    for (let d = start; emit(d); d += interval);
    return out;
  }

  if (rule.freq === 'weekly') {
    const byDay = [...new Set(rule.byDay ?? [weekdayOfDays(start)])];
    const weekStart = toDays(startOfWeek(rule.start, rule.weekStartsOn ?? 1));
    const offsets = byDay.map((wd) => (wd - weekdayOfDays(weekStart) + 7) % 7).sort((x, y) => x - y);
    for (let w = weekStart; ; w += 7 * interval) {
      for (const o of offsets) if (!emit(w + o)) return out;
    }
  }

  if (rule.freq === 'monthly') {
    const [sy, sm, sd] = ymd(rule.start);
    for (let k = 0; ; k += interval) {
      const total = sy * 12 + sm - 1 + k;
      const y = Math.floor(total / 12), m = total - y * 12 + 1;
      const first = Date.UTC(y, m - 1, 1) / DAY_MS;
      if (first > hi) return out;
      const dim = daysInMonth(y, m);
      const days: number[] = [];
      if (rule.byDay && rule.byDay.length) {
        for (const wd of new Set(rule.byDay)) {
          const matches: number[] = [];
          for (let d = first + ((wd - weekdayOfDays(first) + 7) % 7); d < first + dim; d += 7) matches.push(d);
          if (rule.nth === undefined) days.push(...matches);
          else {
            const pick = rule.nth > 0 ? matches[rule.nth - 1] : matches[matches.length + rule.nth];
            if (pick !== undefined) days.push(pick);
          }
        }
      } else {
        const md = rule.byMonthDay ?? sd;
        const day = md > 0 ? md : dim + 1 + md;
        if (day >= 1 && day <= dim) days.push(first + day - 1);
      }
      days.sort((x, y) => x - y);
      for (const d of days) if (!emit(d)) return out;
    }
  }
  throw new RangeError(`Unknown freq: ${String((rule as RecurrenceRule).freq)}`);
}
