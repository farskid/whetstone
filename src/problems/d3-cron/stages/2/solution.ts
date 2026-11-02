import type { CronSchedule } from './types';

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
