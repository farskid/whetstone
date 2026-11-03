export interface PMapOptions {
  /** Max mapper calls in flight. Default Infinity. Must be an integer >= 1, or Infinity. */
  concurrency?: number;
  /** Default true: the first error rejects at once. false: run everything, then reject with an AggregateError. */
  stopOnError?: boolean;
  /** Aborting rejects with signal.reason and starts no new calls. */
  signal?: AbortSignal;
}

/** What `pMap` maps over: values or promises, sync or async iterable. */
export type PMapInput<T> = Iterable<T | Promise<T>> | AsyncIterable<T>;
