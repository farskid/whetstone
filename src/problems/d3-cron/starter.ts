import type { CronSchedule, NextOptions } from './types';

export function parseCron(expr: string): CronSchedule {
  throw new Error('Not implemented');
}

export function next(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  throw new Error('Not implemented');
}

export function prev(expr: string, from: Date, opts: NextOptions = {}): Date | null {
  throw new Error('Not implemented');
}
