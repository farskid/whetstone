import type { RunOptions, Limiter } from './types';

interface Job {
  start: () => void;
  reject: (e: unknown) => void;
  priority: number;
  seq: number;
  detach: () => void;
}

function abortError(message = 'This operation was aborted'): Error {
  const e = new Error(message);
  e.name = 'AbortError';
  return e;
}

function checkConcurrency(n: number) {
  if (!(n === Infinity || (Number.isInteger(n) && n >= 1))) {
    throw new TypeError(`concurrency must be an integer >= 1 or Infinity, got ${String(n)}`);
  }
}

export function createLimiter(concurrency: number): Limiter {
  checkConcurrency(concurrency);
  let limit = concurrency;
  let active = 0;
  let seq = 0;
  const queue: Job[] = []; // kept sorted: priority desc, then seq asc
  let idleWaiters: Array<() => void> = [];

  const insert = (job: Job) => {
    let i = queue.length;
    while (i > 0 && queue[i - 1].priority < job.priority) i--;
    queue.splice(i, 0, job);
  };

  const checkIdle = () => {
    if (active === 0 && queue.length === 0 && idleWaiters.length) {
      const ws = idleWaiters;
      idleWaiters = [];
      ws.forEach((w) => w());
    }
  };

  const pump = () => {
    while (active < limit && queue.length) {
      const job = queue.shift()!;
      job.detach();
      job.start();
    }
    checkIdle();
  };

  const limiter: Limiter = {
    run<T>(fn: () => T | Promise<T>, options: RunOptions = {}): Promise<T> {
      const { priority = 0, signal } = options;
      return new Promise<T>((resolve, reject) => {
        if (signal?.aborted) { reject(abortError()); return; }
        const start = () => {
          active++;
          let p: Promise<T>;
          try { p = Promise.resolve(fn()); } catch (e) { p = Promise.reject(e); }
          // Free the slot before settling, so the caller already sees the updated counts.
          const done = () => { active--; pump(); };
          p.then((v) => { done(); resolve(v); }, (e) => { done(); reject(e); });
        };
        const onAbort = () => {
          const i = queue.indexOf(job);
          if (i >= 0) { queue.splice(i, 1); reject(abortError()); checkIdle(); }
        };
        const job: Job = {
          start, reject, priority, seq: seq++,
          detach: () => signal?.removeEventListener('abort', onAbort),
        };
        if (active < limit) { start(); return; }
        signal?.addEventListener('abort', onAbort, { once: true });
        insert(job);
      });
    },
    get activeCount() { return active; },
    get pendingCount() { return queue.length; },
    get concurrency() { return limit; },
    set concurrency(n: number) { checkConcurrency(n); limit = n; pump(); },
    clearQueue() {
      const jobs = queue.splice(0);
      for (const j of jobs) { j.detach(); j.reject(abortError('Queue was cleared')); }
      checkIdle();
    },
    onIdle() {
      return new Promise<void>((resolve) => {
        if (active === 0 && queue.length === 0) { resolve(); return; }
        idleWaiters.push(resolve);
      });
    },
  };
  return limiter;
}
