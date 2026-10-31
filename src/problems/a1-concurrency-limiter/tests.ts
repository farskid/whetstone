import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

export const tests: TestCase<M>[] = [
  {
    title: 'run() resolves with the task result (sync or async)',
    input: 'run(() => 42), run(async () => "x")',
    async run({ createLimiter }, { expect }) {
      const l = createLimiter(2);
      expect(await l.run(() => 42)).toBe(42);
      expect(await l.run(async () => 'x')).toBe('x');
    },
  },
  {
    title: 'never more than `concurrency` tasks in flight',
    input: 'concurrency 2, 6 tasks resolved by hand',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(2);
      const ds = Array.from({ length: 6 }, () => deferred<number>());
      let running = 0, maxRunning = 0;
      const out = ds.map((d, i) => l.run(async () => {
        running++; maxRunning = Math.max(maxRunning, running);
        try { return await d.promise; } finally { running--; }
      }).then((v) => v * 10 + i));
      expect(running, 'running right after queueing').toBe(2);
      for (let i = 0; i < 6; i++) { ds[i].resolve(i); await flush(); }
      expect(await Promise.all(out)).toEqual([0, 11, 22, 33, 44, 55]);
      expect(maxRunning).toBe(2);
    },
  },
  {
    title: 'a free slot starts the task synchronously',
    async run({ createLimiter }, { expect }) {
      const l = createLimiter(1);
      let started = false;
      l.run(() => { started = true; });
      expect(started, 'fn called inside run()').toBe(true);
    },
  },
  {
    title: 'activeCount and pendingCount',
    input: 'concurrency 2, 5 pending tasks',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(2);
      const ds = Array.from({ length: 5 }, () => deferred<void>());
      ds.forEach((d) => l.run(() => d.promise));
      expect([l.activeCount, l.pendingCount]).toEqual([2, 3]);
      ds[0].resolve(); await flush();
      expect([l.activeCount, l.pendingCount], 'after one finishes').toEqual([2, 2]);
      ds.forEach((d) => d.resolve()); await flush(); await flush();
      expect([l.activeCount, l.pendingCount]).toEqual([0, 0]);
    },
  },
  {
    title: 'FIFO order within the same priority',
    async run({ createLimiter }, { expect }) {
      const l = createLimiter(1);
      const order: number[] = [];
      await Promise.all([1, 2, 3, 4, 5].map((n) => l.run(async () => { order.push(n); })));
      expect(order).toEqual([1, 2, 3, 4, 5]);
    },
  },
  {
    title: 'errors reject that run() and free the slot',
    input: 'concurrency 1: throwing task, rejecting task, then a normal one',
    async run({ createLimiter }, { expect }) {
      const l = createLimiter(1);
      const a = l.run(() => { throw new Error('sync boom'); });
      const b = l.run(() => Promise.reject(new Error('async boom')));
      const c = l.run(() => 'ok');
      await expect(a).toReject('sync boom');
      await expect(b).toReject('async boom');
      expect(await c).toBe('ok');
      expect(l.activeCount).toBe(0);
    },
  },
  {
    title: 'higher priority jumps the queue; ties stay FIFO',
    input: 'concurrency 1; queue a(0) b(5) c(0) d(5) e(10)',
    async run({ createLimiter }, { expect, deferred }) {
      const l = createLimiter(1);
      const gate = deferred<void>();
      const order: string[] = [];
      const first = l.run(() => gate.promise);
      const ps = [['a', 0], ['b', 5], ['c', 0], ['d', 5], ['e', 10]].map(([n, p]) =>
        l.run(async () => { order.push(n as string); }, { priority: p as number }));
      gate.resolve();
      await Promise.all([first, ...ps]);
      expect(order).toEqual(['e', 'b', 'd', 'a', 'c']);
    },
  },
  {
    title: 'clearQueue() rejects queued tasks with AbortError, running ones finish',
    async run({ createLimiter }, { expect, deferred }) {
      const l = createLimiter(1);
      const d = deferred<string>();
      let laterCalled = false;
      const running = l.run(() => d.promise);
      const q1 = l.run(() => { laterCalled = true; });
      const q2 = l.run(() => { laterCalled = true; });
      l.clearQueue();
      expect(l.pendingCount).toBe(0);
      await expect(q1).toReject(isAbort);
      await expect(q2).toReject(isAbort);
      d.resolve('done');
      expect(await running).toBe('done');
      expect(laterCalled, 'cleared tasks must never run').toBe(false);
    },
  },
  {
    title: 'already-aborted signal: rejects and never calls fn',
    async run({ createLimiter }, { expect }) {
      const l = createLimiter(3);
      const ac = new AbortController(); ac.abort();
      let called = false;
      await expect(l.run(() => { called = true; }, { signal: ac.signal })).toReject(isAbort);
      expect(called).toBe(false);
      expect(l.activeCount).toBe(0);
    },
  },
  {
    title: 'aborting a queued task removes it from the queue',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(1);
      const d = deferred<void>();
      const ac = new AbortController();
      const order: string[] = [];
      l.run(() => d.promise);
      const a = l.run(() => { order.push('a'); }, { signal: ac.signal });
      const b = l.run(() => { order.push('b'); });
      ac.abort();
      expect(l.pendingCount, 'pending after abort').toBe(1);
      await expect(a).toReject(isAbort);
      d.resolve(); await b; await flush();
      expect(order).toEqual(['b']);
    },
  },
  {
    title: 'aborting a running task does not reject it',
    async run({ createLimiter }, { expect, deferred }) {
      const l = createLimiter(1);
      const d = deferred<number>();
      const ac = new AbortController();
      const p = l.run(() => d.promise, { signal: ac.signal });
      ac.abort();
      d.resolve(7);
      expect(await p).toBe(7);
    },
  },
  {
    title: 'raising concurrency starts queued tasks immediately',
    async run({ createLimiter }, { expect, deferred }) {
      const l = createLimiter(1);
      const ds = Array.from({ length: 4 }, () => deferred<void>());
      ds.forEach((d) => l.run(() => d.promise));
      expect(l.activeCount).toBe(1);
      l.concurrency = 3;
      expect(l.concurrency).toBe(3);
      expect([l.activeCount, l.pendingCount]).toEqual([3, 1]);
    },
  },
  {
    title: 'lowering concurrency never interrupts running tasks',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(3);
      const ds = Array.from({ length: 5 }, () => deferred<void>());
      ds.forEach((d) => l.run(() => d.promise));
      l.concurrency = 1;
      expect([l.activeCount, l.pendingCount]).toEqual([3, 2]);
      ds[0].resolve(); ds[1].resolve(); await flush();
      expect(l.activeCount, 'no new start until below the new limit').toBe(1);
      expect(l.pendingCount).toBe(2);
      ds[2].resolve(); await flush();
      expect([l.activeCount, l.pendingCount]).toEqual([1, 1]);
    },
  },
  {
    title: 'invalid concurrency throws TypeError',
    input: 'createLimiter(0 | -1 | 1.5 | NaN), limiter.concurrency = 0',
    run({ createLimiter }, { expect }) {
      for (const bad of [0, -1, 1.5, NaN]) {
        let err: unknown;
        try { createLimiter(bad); } catch (e) { err = e; }
        expect(err, `createLimiter(${bad})`).toBeInstanceOf(TypeError);
      }
      expect(() => createLimiter(Infinity)).not.toThrow();
      const l = createLimiter(2);
      let err: unknown;
      try { l.concurrency = 0; } catch (e) { err = e; }
      expect(err, 'setter').toBeInstanceOf(TypeError);
      expect(l.concurrency).toBe(2);
    },
  },
  {
    title: 'onIdle() waits for running and queued work',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(1);
      const a = deferred<void>(), b = deferred<void>();
      l.run(() => a.promise); l.run(() => b.promise);
      let idle = false;
      l.onIdle().then(() => { idle = true; });
      a.resolve(); await flush();
      expect(idle, 'still one task left').toBe(false);
      b.resolve(); await flush(); await flush();
      expect(idle).toBe(true);
      await l.onIdle(); // already idle: resolves
    },
  },
  {
    title: 'onIdle() after clearQueue() resolves once the running task ends',
    async run({ createLimiter }, { expect, deferred, flush }) {
      const l = createLimiter(1);
      const a = deferred<void>();
      l.run(() => a.promise);
      l.run(() => undefined).catch(() => {});
      let idle = false;
      l.onIdle().then(() => { idle = true; });
      l.clearQueue(); await flush();
      expect(idle).toBe(false);
      a.resolve(); await flush(); await flush();
      expect(idle).toBe(true);
    },
  },
];
