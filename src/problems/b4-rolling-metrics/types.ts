/** Time source in ms. Default: Date. */
export interface Clock { now(): number }

/** Options for `new TimeWindow(options)`. */
export interface TimeWindowOptions {
  windowMs: number;
  clock?: Clock;
}

/** Options for `new HistogramWindow(options)`. */
export interface HistogramWindowOptions {
  windowMs: number;
  sliceMs: number;
  /** Ascending bucket upper bounds. */
  buckets: number[];
  clock?: Clock;
}
