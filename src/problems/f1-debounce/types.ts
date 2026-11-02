export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  clock?: Clock;
}

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
  pending(): boolean;
}
