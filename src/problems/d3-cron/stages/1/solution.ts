import type { CronSchedule } from './types';

const FIELDS: Array<{ min: number; max: number }> = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
];

function fail(expr: string): never {
  throw new Error(`Invalid cron expression: ${expr}`);
}

function parseField(text: string, f: (typeof FIELDS)[number], expr: string): number[] {
  const out = new Set<number>();
  for (const part of text.split(',')) {
    if (part === '*') {
      for (let v = f.min; v <= f.max; v++) out.add(v);
      continue;
    }
    if (!/^\d+$/.test(part)) fail(expr);
    const v = Number(part);
    if (v < f.min || v > f.max) fail(expr);
    out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

export function parseCron(expr: string): CronSchedule {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) fail(expr);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.map((p, i) => parseField(p, FIELDS[i], expr));
  return { minute, hour, dayOfMonth, month, dayOfWeek, domRestricted: parts[2][0] !== '*', dowRestricted: parts[4][0] !== '*' };
}
