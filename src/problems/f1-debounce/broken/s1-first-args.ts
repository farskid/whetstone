// Bug: calls fn with the FIRST args of the burst instead of the latest.
export interface Clock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait: number,
  options: { clock?: Clock } = {},
): (...args: A) => void {
  const clock = options.clock ?? globalClock;
  let timer: unknown = undefined;
  let firstArgs: A | undefined;
  return function (this: unknown, ...args: A) {
    if (timer !== undefined) clock.clearTimeout(timer);
    if (firstArgs === undefined) firstArgs = args;
    timer = clock.setTimeout(() => {
      timer = undefined;
      const a = firstArgs!; firstArgs = undefined;
      fn.apply(this, a);
    }, wait);
  };
}
