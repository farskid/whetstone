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
  let inBurst = false;
  let hasTrailing = false;
  let lastArgs: A | undefined;
  let lastThis: unknown;

  const endBurst = () => {
    timer = undefined;
    inBurst = false;
    if (hasTrailing) {
      const args = lastArgs!, self = lastThis;
      hasTrailing = false; lastArgs = undefined; lastThis = undefined;
      fn.apply(self, args);
    }
  };

  const debounced = function (this: unknown, ...args: A) {
    const first = !inBurst;
    inBurst = true;
    if (timer !== undefined) clock.clearTimeout(timer);
    if (first && leading) {
      fn.apply(this, args);
    } else if (trailing) {
      hasTrailing = true; lastArgs = args; lastThis = this;
    }
    timer = clock.setTimeout(endBurst, wait);
  } as Debounced<A>;

  debounced.cancel = () => {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined; inBurst = false;
    hasTrailing = false; lastArgs = undefined; lastThis = undefined;
  };
  debounced.pending = () => hasTrailing;
  return debounced;
}
