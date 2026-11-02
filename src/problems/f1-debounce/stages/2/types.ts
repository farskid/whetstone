export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface DebounceOptions {
  /** Default false: undefined behaves like false. */
  leading?: boolean;
  /** Default true: undefined behaves like true; only an explicit false turns it off. */
  trailing?: boolean;
  clock?: Clock;
}
