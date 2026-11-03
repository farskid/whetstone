// Bug: ignores calls while a timer is running (a throttle, not a debounce): no restart, first args win.
export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: { clock?: Clock } = {},
): (...args: A) => void {
  const clock = options.clock ?? globalClock;
  let timer: number | undefined = undefined;
  return function (this: unknown, ...args: A) {
    if (timer !== undefined) return;
    timer = clock.setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };
}
