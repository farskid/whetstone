import type { SemVer } from './types';

export function parse(input: string): SemVer | null {
  throw new Error('Not implemented');
}

export function compare(a: string, b: string): -1 | 0 | 1 {
  throw new Error('Not implemented');
}

export function satisfies(version: string, range: string): boolean {
  throw new Error('Not implemented');
}

export function maxSatisfying(versions: string[], range: string): string | null {
  throw new Error('Not implemented');
}
