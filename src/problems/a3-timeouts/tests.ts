import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Reject on timeout';
const G2 = 'Fallback, message and cleanup';
const G3 = 'Abortable tasks';
const G4 = 'anySignal';

/** Wraps a real AbortSignal and counts listeners added/removed on it. */
function counted(signal: AbortSignal) {
  const counts = { added: 0, removed: 0 };
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  (signal as any).addEventListener = (...a: any[]) => { counts.added++; return (add as any)(...a); };
  (signal as any).removeEventListener = (...a: any[]) => { counts.removed++; return (remove as any)(...a); };
  return counts;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'resolves with the value when the promise wins',
    async run({ withTimeout }, { expect, clock, deferred }) {
      const c = clock(); const d = deferred<string>();
      const p = withTimeout(d.promise, 100, { clock: c });
      await c.advance(99);
      d.resolve('fast');
      expect(await p).toBe('fast');
    },
  },
  {
    group: G1,
    title: 'passes through a rejection that comes first',
    async run({ withTimeout }, { expect, clock }) {
      await expect(withTimeout(Promise.reject(new Error('own error')), 100, { clock: clock() })).toReject('own error');
    },
  },
  {
    group: G1,
    title: 'rejects with TimeoutError("Timed out after 100 ms") at the deadline',
    async run({ withTimeout, TimeoutError }, { expect, clock, deferred }) {
      const c = clock(); const d = deferred<string>();
      const p = withTimeout(d.promise, 100, { clock: c });
      p.catch(() => {});
      let settled = false; p.then(() => {}, () => { settled = true; });
      await c.advance(99);
      expect(settled, 'settled at 99 ms').toBe(false);
      await c.advance(1);
      await expect(p).toReject((e) => e instanceof TimeoutError && (e as Error).name === 'TimeoutError' && (e as Error).message === 'Timed out after 100 ms');
    },
  },
  {
    group: G1,
    title: 'a late resolve after the timeout changes nothing',
    async run({ withTimeout, TimeoutError }, { expect, clock, deferred }) {
      const c = clock(); const d = deferred<string>();
      const p = withTimeout(d.promise, 10, { clock: c });
      p.catch(() => {});
      await c.advance(10);
      d.resolve('late');
      await expect(p).toReject((e) => e instanceof TimeoutError);
    },
  },
  {
    group: G1,
    title: 'ms = Infinity never times out and sets no timer',
    async run({ withTimeout }, { expect, clock, deferred }) {
      const c = clock(); const d = deferred<number>();
      const p = withTimeout(d.promise, Infinity, { clock: c });
      expect(c.pendingTimers(), 'timers').toBe(0);
      d.resolve(1);
      expect(await p).toBe(1);
    },
  },
  {
    group: G2,
    title: 'no timer is left after the promise settles first',
    async run({ withTimeout }, { expect, clock }) {
      const c = clock();
      await withTimeout(Promise.resolve(1), 1000, { clock: c });
      await withTimeout(Promise.reject(new Error('x')), 1000, { clock: c }).catch(() => {});
      expect(c.pendingTimers(), 'timers').toBe(0);
    },
  },
  {
    group: G2,
    title: 'fallback value resolves instead of rejecting',
    async run({ withTimeout }, { expect, clock, deferred }) {
      const c = clock();
      const p = withTimeout(deferred<string>().promise, 50, { fallback: 'cached', clock: c });
      await c.advance(50);
      expect(await p).toBe('cached');
    },
  },
  {
    group: G2,
    title: 'fallback function is called and its result (or throw) is used',
    async run({ withTimeout }, { expect, clock, deferred }) {
      const c = clock();
      let calls = 0;
      const a = withTimeout(deferred<string>().promise, 50, { fallback: async () => { calls++; return 'from fn'; }, clock: c });
      const b = withTimeout(deferred<string>().promise, 50, { fallback: () => { throw new Error('fallback failed'); }, clock: c });
      b.catch(() => {});
      await c.advance(50);
      expect(await a).toBe('from fn');
      expect(calls, 'fallback calls').toBe(1);
      await expect(b).toReject('fallback failed');
    },
  },
  {
    group: G2,
    title: 'message: a string sets the TimeoutError message, an Error is used as-is',
    async run({ withTimeout, TimeoutError }, { expect, clock, deferred }) {
      const c = clock();
      const custom = new RangeError('too slow');
      const a = withTimeout(deferred().promise, 5, { message: 'API is slow', clock: c });
      const b = withTimeout(deferred().promise, 5, { message: custom, clock: c });
      a.catch(() => {}); b.catch(() => {});
      await c.advance(5);
      await expect(a).toReject((e) => e instanceof TimeoutError && (e as Error).message === 'API is slow');
      await expect(b).toReject((e) => e === custom);
    },
  },
  {
    group: G3,
    title: 'a task is called once, synchronously, with a live signal',
    async run({ withTimeout }, { expect, clock }) {
      const c = clock();
      const seen: AbortSignal[] = [];
      const p = withTimeout((signal) => { seen.push(signal); return Promise.resolve('done'); }, 100, { clock: c });
      expect(seen.length, 'calls right after withTimeout()').toBe(1);
      expect(seen[0] instanceof AbortSignal && !seen[0].aborted, 'got a live AbortSignal').toBe(true);
      expect(await p).toBe('done');
    },
  },
  {
    group: G3,
    title: 'on timeout the task signal is aborted with the timeout error',
    async run({ withTimeout, TimeoutError }, { expect, clock }) {
      const c = clock();
      let signal!: AbortSignal;
      const p = withTimeout((s) => { signal = s; return new Promise<never>(() => {}); }, 30, { clock: c });
      p.catch(() => {});
      await c.advance(30);
      expect(signal.aborted, 'task signal aborted').toBe(true);
      expect(signal.reason instanceof TimeoutError, 'reason is the TimeoutError').toBe(true);
      await expect(p).toReject((e) => e === signal.reason);
    },
  },
  {
    group: G3,
    title: 'outer signal: already aborted rejects without calling the task',
    async run({ withTimeout }, { expect, clock }) {
      const ac = new AbortController(); ac.abort('navigated away');
      let calls = 0;
      await expect(withTimeout(() => { calls++; return Promise.resolve(1); }, 100, { signal: ac.signal, clock: clock() }))
        .toReject((e) => e === 'navigated away');
      expect(calls, 'task calls').toBe(0);
    },
  },
  {
    group: G3,
    title: 'outer signal aborting later rejects, aborts the task and clears the timer',
    async run({ withTimeout }, { expect, clock }) {
      const c = clock(); const ac = new AbortController();
      let signal!: AbortSignal;
      const p = withTimeout((s) => { signal = s; return new Promise<never>(() => {}); }, 1000, { signal: ac.signal, clock: c });
      p.catch(() => {});
      await c.advance(10);
      ac.abort('cancel');
      await expect(p).toReject((e) => e === 'cancel');
      expect(signal.reason, 'task signal reason').toBe('cancel');
      expect(c.pendingTimers(), 'timers').toBe(0);
    },
  },
  {
    group: G4,
    title: 'aborts when any input aborts, with that reason',
    run({ anySignal }, { expect }) {
      const a = new AbortController(), b = new AbortController();
      const s = anySignal([a.signal, b.signal]);
      expect(s.aborted, 'before').toBe(false);
      b.abort('b went');
      expect(s.aborted, 'after b aborts').toBe(true);
      expect(s.reason).toBe('b went');
    },
  },
  {
    group: G4,
    title: 'keeps the first reason when more inputs abort later',
    run({ anySignal }, { expect }) {
      const a = new AbortController(), b = new AbortController();
      const s = anySignal([a.signal, b.signal]);
      a.abort('first'); b.abort('second');
      expect(s.reason).toBe('first');
    },
  },
  {
    group: G4,
    title: 'an already-aborted input aborts the result right away',
    run({ anySignal }, { expect }) {
      const a = new AbortController(), b = new AbortController(), c = new AbortController();
      b.abort('b early'); c.abort('c early');
      const s = anySignal([a.signal, b.signal, c.signal]);
      expect(s.aborted).toBe(true);
      expect(s.reason, 'first aborted input in array order').toBe('b early');
    },
  },
  {
    group: G4,
    title: 'removes its listeners from every input once aborted',
    run({ anySignal }, { expect }) {
      const a = new AbortController(), b = new AbortController();
      const ca = counted(a.signal), cb = counted(b.signal);
      anySignal([a.signal, b.signal]);
      a.abort('x');
      expect([ca.removed >= ca.added, cb.removed >= cb.added], 'every added listener removed').toEqual([true, true]);
      expect(ca.added + cb.added, 'listeners added').toBeGreaterThan(0);
    },
  },
  {
    group: G4,
    title: 'anySignal([]) never aborts',
    run({ anySignal }, { expect }) {
      const s = anySignal([]);
      expect(s instanceof AbortSignal && !s.aborted).toBe(true);
    },
  },
];
