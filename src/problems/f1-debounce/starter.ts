export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
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

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: DebounceOptions = {},
): Debounced<A> {
  throw new Error('Not implemented');
}
