import type { Match, SearchOptions, SearchResult } from './types';

export const SCORE = { match: 16, start: 10, separator: 9, boundary: 8, consecutive: 8, gapStart: 3, gapExtend: 1, typo: 10 };

export function fuzzyMatch(query: string, text: string): Match | null {
  throw new Error('Not implemented');
}

export function search<T>(items: T[], query: string, options: SearchOptions = {}): SearchResult<T>[] {
  throw new Error('Not implemented');
}
