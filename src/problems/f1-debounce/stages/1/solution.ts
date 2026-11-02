import type { Clock, DebounceOptions } from './types';

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: DebounceOptions = {},
): (...args: A) => void {
  const { clock = globalClock } = options;
  let timer: unknown = undefined;
  return function (this: unknown, ...args: A) {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = clock.setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };
}
