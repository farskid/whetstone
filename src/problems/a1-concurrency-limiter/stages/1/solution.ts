import type { Limiter } from './types';

function checkConcurrency(n: number) {
  if (!(n === Infinity || (Number.isInteger(n) && n >= 1))) {
    throw new TypeError(`concurrency must be an integer >= 1 or Infinity, got ${String(n)}`);
  }
}

export function createLimiter(concurrency: number): Limiter {
  checkConcurrency(concurrency);
  let active = 0;
  const queue: Array<() => void> = [];

  const pump = () => {
    while (active < concurrency && queue.length) queue.shift()!();
  };

  return {
    run<T>(fn: () => T | Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const start = () => {
          active++;
          let p: Promise<T>;
          try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
          const done = () => { active--; pump(); };
          p.then((v) => { done(); resolve(v); }, (e) => { done(); reject(e); });
        };
        if (active < concurrency) start();
        else queue.push(start);
      });
    },
  };
}
