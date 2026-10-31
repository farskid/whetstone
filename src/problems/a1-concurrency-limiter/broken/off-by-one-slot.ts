// Broken: frees the slot before the task's promise settles, and ignores priority.
export interface RunOptions { priority?: number; signal?: AbortSignal }
export interface Limiter {
  run<T>(fn: () => T | Promise<T>, options?: RunOptions): Promise<T>;
  readonly activeCount: number; readonly pendingCount: number; concurrency: number;
  clearQueue(): void; onIdle(): Promise<void>;
}
export function createLimiter(concurrency: number): Limiter {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => { if (active < concurrency && queue.length) queue.shift()!(); };
  return {
    run<T>(fn: () => T | Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const start = () => { active++; const p = Promise.resolve().then(fn); active--; next(); p.then(resolve, reject); };
        queue.push(start); next();
      });
    },
    get activeCount() { return active; },
    get pendingCount() { return queue.length; },
    get concurrency() { return concurrency; },
    set concurrency(n) { concurrency = n; },
    clearQueue() { queue.length = 0; },
    onIdle() { return Promise.resolve(); },
  };
}
