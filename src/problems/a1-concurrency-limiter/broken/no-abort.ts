// Broken: a correct limiter in every respect except AbortSignal and clearQueue handling.
export interface RunOptions { priority?: number; signal?: AbortSignal }
export interface Limiter {
  run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
  readonly activeCount: number; readonly pendingCount: number; concurrency: number;
  clearQueue(): void; onIdle(): Promise<void>;
}
export function createLimiter(concurrency: number): Limiter {
  if (!(concurrency === Infinity || (Number.isInteger(concurrency) && concurrency >= 1))) throw new TypeError('bad');
  let active = 0;
  const queue: Array<{ start: () => void; priority: number }> = [];
  let idle: Array<() => void> = [];
  const pump = () => {
    while (active < concurrency && queue.length) queue.shift()!.start();
    if (!active && !queue.length) { idle.forEach((f) => f()); idle = []; }
  };
  return {
    run<T>(fn: () => T | Promise<T>, o: RunOptions = {}): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const start = () => {
          active++;
          let p: Promise<T>;
          try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
          p.then(resolve, reject).finally(() => { active--; pump(); });
        };
        if (active < concurrency) return start();
        const priority = o.priority ?? 0;
        let i = queue.length;
        while (i > 0 && queue[i - 1].priority < priority) i--;
        queue.splice(i, 0, { start, priority });
      });
    },
    get activeCount() { return active; },
    get pendingCount() { return queue.length; },
    get concurrency() { return concurrency; },
    set concurrency(n) { if (!(n === Infinity || (Number.isInteger(n) && n >= 1))) throw new TypeError('bad'); concurrency = n; pump(); },
    clearQueue() { queue.length = 0; },
    onIdle() { return new Promise<void>((r) => { if (!active && !queue.length) r(); else idle.push(r); }); },
  };
}
