import type { Clock, DebounceOptions } from './types';

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: DebounceOptions = {},
): (...args: A) => void {
  throw new Error('Not implemented');
}
