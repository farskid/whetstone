import type { PathKey, Match } from './types';

export function get(obj: unknown, path: string | PathKey[], defaultValue?: unknown): unknown {
  throw new Error('Not implemented');
}

export function set<T extends object>(obj: T, path: string | PathKey[], value: unknown): T {
  throw new Error('Not implemented');
}

export function setIn<T>(obj: T, path: string | PathKey[], value: unknown): T {
  throw new Error('Not implemented');
}

export function query(obj: unknown, path: string): Match[] {
  throw new Error('Not implemented');
}
