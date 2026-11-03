// This problem has no shared types.
export {};

/** Options for `memoize`. */
export interface MemoizeOptions {
  /** Keep at most this many results, evicting the least recently used. Default: unbounded. */
  max?: number;
}

/** What `memoize` returns: `fn`, plus `clear()` to drop every cached result. */
export type Memoized<F> = F & { clear(): void };
