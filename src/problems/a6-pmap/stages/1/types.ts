export interface PMapOptions {
  /** Max mapper calls in flight. Default Infinity. Must be an integer >= 1, or Infinity. */
  concurrency?: number;
}
