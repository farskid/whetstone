export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  clock?: Clock,
): (...args: A) => void {
  throw new Error('Not implemented');
}
