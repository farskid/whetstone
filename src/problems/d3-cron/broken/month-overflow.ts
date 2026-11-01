// Bug: jumping months from the 31st overflows
export interface CronSchedule {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
  domRestricted: boolean;
  dowRestricted: boolean;
}
export interface NextOptions {
  tz?: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const FIELDS: Array<{ min: number; max: number; names?: string[]; base?: number }> = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12, names: MONTHS, base: 1 },
  { min: 0, max: 7, names: DAYS, base: 0 },
];

function fail(expr: string): never {
  throw new Error(`Invalid cron expression: ${expr}`);
}

function parseField(text: string, f: (typeof FIELDS)[number], expr: string): number[] {
  const out = new Set<number>();
  const value = (s: string): number => {
    if (/^\d+$/.test(s)) return Number(s);
    const i = f.names?.indexOf(s.toUpperCase()) ?? -1;
    if (i < 0) fail(expr);
    return i + f.base!;
  };
  for (const part of text.split(',')) {
    const m = /^([^/]+)(?:\/(\d+))?$/.exec(part);
    if (!m) fail(expr);
    const step = m[2] === undefined ? 1 : Number(m[2]);
    if (step < 1) fail(expr);
    let lo: number;
    let hi: number;
    if (m[1] === '*') { lo = f.min; hi = f.max; }
    else if (m[1].includes('-')) {
      const [a, b, extra] = m[1].split('-');
      if (extra !== undefined) fail(expr);
      lo = value(a); hi = value(b);
    } else {
      lo = value(m[1]);
      hi = m[2] === undefined ? lo : f.max;
    }
    if (lo < f.min || hi > f.max || lo > hi) fail(expr);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

export function parseCron(expr: string): CronSchedule {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) fail(expr);
  const [minute, hour, dayOfMonth, month, dow] = parts.map((p, i) => parseField(p, FIELDS[i], expr));
  const dayOfWeek = [...new Set(dow.map((d) => d % 7))].sort((a, b) => a - b);
  return { minute, hour, dayOfMonth, month, dayOfWeek, domRestricted: parts[2][0] !== '*', dowRestricted: parts[4][0] !== '*' };
}

// ---- wall-clock arithmetic: a "wall" value is a Date whose UTC fields are the local time ----
const MIN = 60_000;

function dayMatches(s: CronSchedule, d: Date): boolean {
  const dom = s.dayOfMonth.includes(d.getUTCDate());
  const dow = s.dayOfWeek.includes(d.getUTCDay());
  if (s.domRestricted && s.dowRestricted) return dom || dow;
  return dom && dow;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function offsetAt(instant: number, tz: string | undefined): number {
  if (!tz || tz === 'UTC') return 0;
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(instant))) if (part.type !== 'literal') p[part.type] = Number(part.value);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(instant / 1000) * 1000;
}

// The earliest instant showing this wall time, or null if the wall time is skipped.
function toInstant(wall: number, tz: string | undefined): number | null {
  const offsets = new Set([offsetAt(wall - 86_400_000, tz), offsetAt(wall, tz), offsetAt(wall + 86_400_000, tz)]);
  const valid = [...offsets].map((o) => wall - o).filter((t) => offsetAt(t, tz) === wall - t);
  return valid.length ? Math.min(...valid) : null;
}

const LIMIT = 10 * 366 * 86_400_000;

function search(expr: string, from: Date, dir: 1 | -1, opts: NextOptions): Date | null {
  const s = parseCron(expr);
  const fromMs = from.getTime();
  const start = Math.floor((fromMs + offsetAt(fromMs, opts.tz)) / MIN) * MIN;
  const d = new Date(start - dir * 2 * 60 * MIN);
  while (Math.abs(d.getTime() - start) < LIMIT) {
    if (!s.month.includes(d.getUTCMonth() + 1)) {
      if (dir > 0) { d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(1); }
      else d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      if (dir < 0) d.setTime(d.getTime() - MIN);
      continue;
    }
    if (!dayMatches(s, d)) {
      if (dir > 0) d.setUTCDate(d.getUTCDate() + 1);
      d.setUTCHours(0, 0, 0, 0);
      if (dir < 0) d.setTime(d.getTime() - MIN);
      continue;
    }
    if (!s.hour.includes(d.getUTCHours())) {
      if (dir > 0) d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0);
      else d.setTime(d.getTime() - d.getUTCMinutes() * MIN - MIN);
      continue;
    }
    if (!s.minute.includes(d.getUTCMinutes())) {
      d.setTime(d.getTime() + dir * MIN);
      continue;
    }
    const t = toInstant(d.getTime(), opts.tz);
    if (t !== null && (dir > 0 ? t > fromMs : t < fromMs)) return new Date(t);
    d.setTime(d.getTime() + dir * MIN);
  }
  return null;
}

export function next(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  return search(expr, from, 1, opts);
}

export function prev(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  return search(expr, from, -1, opts);
}
