export interface PMapOptions {
  /** Max mapper calls in flight. Default Infinity. Must be an integer >= 1, or Infinity. */
  concurrency?: number;
}

/** What `pMap` maps over: values or promises, sync or async iterable. */
export type PMapInput<T> = Iterable<T | Promise<T>> | AsyncIterable<T>;
