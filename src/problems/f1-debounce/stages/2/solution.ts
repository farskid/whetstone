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
  const { leading = false, trailing = true, clock = globalClock } = options;
  let timer: number | undefined = undefined;
  let hasTrailing = false;
  let lastArgs: A | undefined;
  let lastThis: unknown;

  const endBurst = () => {
    timer = undefined;
    if (hasTrailing) {
      const args = lastArgs!, self = lastThis;
      hasTrailing = false; lastArgs = undefined; lastThis = undefined;
      fn.apply(self, args);
    }
  };

  return function (this: unknown, ...args: A) {
    const first = timer === undefined;
    if (timer !== undefined) clock.clearTimeout(timer);
    if (first && leading) {
      fn.apply(this, args);
    } else if (trailing) {
      hasTrailing = true; lastArgs = args; lastThis = this;
    }
    timer = clock.setTimeout(endBurst, wait);
  };
}
