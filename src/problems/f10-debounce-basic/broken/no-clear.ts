// Bug: never clears the old timer, so every call in a burst fires.
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
    timer = clock.setTimeout(() => {
      timer = undefined;
      fn.apply(this, args);
    }, wait);
  };
}
