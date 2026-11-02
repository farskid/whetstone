import type { Match, Router } from './types';

export function createRouter<H>(): Router<H> {
  throw new Error('Not implemented');
}

export function buildPath(pattern: string, params: Record<string, string | number>): string {
  throw new Error('Not implemented');
}
