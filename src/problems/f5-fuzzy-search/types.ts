/** A successful match. */
export interface Match {
  /** Score of the chosen alignment. */
  score: number;
  /** Indices into the original text, ascending. */
  positions: number[];
  /** Matched positions merged into half-open [start, end) ranges. */
  ranges: [number, number][];
}

/** A property to search, with an optional weight (default 1). */
export interface SearchKey {
  name: string;
  weight?: number;
}

/** Options for `search`. */
export interface SearchOptions {
  keys?: (string | SearchKey)[];
  typo?: boolean;
  limit?: number;
}

/** One matching item. */
export interface SearchResult<T> extends Match {
  item: T;
  refIndex: number;
  /** The key that produced the best score (undefined for string items). */
  key?: string;
}
