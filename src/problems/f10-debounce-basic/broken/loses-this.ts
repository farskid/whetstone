// Bug: calls fn without `this`.
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
  clock: Clock = globalClock,
): (...args: A) => void {
  let timer: unknown = undefined;
  return function (this: unknown, ...args: A) {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = clock.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, wait);
  };
}
