export interface Match {
  score: number;
  /** Indices into the original text, ascending. */
  positions: number[];
  /** Matched positions merged into half-open [start, end) ranges. */
  ranges: [number, number][];
}

export interface SearchKey {
  name: string;
  weight?: number;
}

export interface SearchOptions {
  keys?: (string | SearchKey)[];
  typo?: boolean;
  limit?: number;
}

export interface SearchResult<T> extends Match {
  item: T;
  refIndex: number;
  /** The key that produced the best score (undefined for string items). */
  key?: string;
}

export const SCORE = { match: 16, start: 10, separator: 9, boundary: 8, consecutive: 8, gapStart: 3, gapExtend: 1, typo: 10 };

export function fuzzyMatch(query: string, text: string): Match | null {
  throw new Error('Not implemented');
}

export function search<T>(items: T[], query: string, options: SearchOptions = {}): SearchResult<T>[] {
  throw new Error('Not implemented');
}
