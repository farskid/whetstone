export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export interface DebounceOptions {
  /** Default false: undefined behaves like false. */
  leading?: boolean;
  /** Default true: undefined behaves like true; only an explicit false turns it off. */
  trailing?: boolean;
  clock?: Clock;
}

/** What `debounce` returns: the debounced function (stage 3 adds `cancel` and `pending`). */
export type Debounced<A extends unknown[]> = (...args: A) => void;
