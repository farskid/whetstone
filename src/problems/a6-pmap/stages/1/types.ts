export interface PMapOptions {
  /** Max mapper calls in flight. Default Infinity. Must be an integer >= 1, or Infinity. */
  concurrency?: number;
}

/** What `pMap` maps over: an iterable of values or promises (stage 2 adds async iterables). */
export type PMapInput<T> = Iterable<T | Promise<T>>;
