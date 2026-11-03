import type { Clock, DebounceOptions, Debounced } from './types';

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: DebounceOptions = {},
): Debounced<A> {
  const { clock = globalClock } = options;
  let timer: number | undefined = undefined;
  return function (this: unknown, ...args: A) {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = clock.setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };
}
