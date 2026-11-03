import type { Clock, DebounceOptions, Debounced } from './types';

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: DebounceOptions = {},
): Debounced<A> {
  throw new Error('Not implemented');
}
