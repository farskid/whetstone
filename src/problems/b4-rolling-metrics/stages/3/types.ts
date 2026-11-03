/** Time source in ms. Default: Date. */
export interface Clock { now(): number }

/** Options for `new TimeWindow(options)`. */
export interface TimeWindowOptions {
  windowMs: number;
  clock?: Clock;
}
