import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Share in-flight calls';
const G2 = 'Result cache with TTL';
const G3 = 'forget(key)';
const G4 = 'Stale-while-revalidate';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'concurrent calls with the same key share one fn call',
    async run({ Group }, { expect, deferred }) {
      const g = new Group<string>();
      const d = deferred<string>();
      let calls = 0;
      const fn = () => { calls++; return d.promise; };
      const ps = [g.do('u', fn), g.do('u', fn), g.do('u', fn)];
      d.resolve('alice');
      expect(await Promise.all(ps)).toEqual(['alice', 'alice', 'alice']);
      expect(calls, 'fn calls').toBe(1);
    },
  },
  {
    group: G1,
    title: 'different keys run separately',
    async run({ Group }, { expect }) {
      const g = new Group<string>();
      const calls: string[] = [];
      const [a, b] = await Promise.all([g.do('a', async () => { calls.push('a'); return 'A'; }), g.do('b', async () => { calls.push('b'); return 'B'; })]);
      expect([a, b]).toEqual(['A', 'B']);
      expect(calls).toEqual(['a', 'b']);
    },
  },
  {
    group: G1,
    title: 'every waiter sees the same rejection',
    async run({ Group }, { expect, deferred }) {
      const g = new Group<string>();
      const d = deferred<string>();
      const err = new Error('down');
      const ps = [g.do('k', () => d.promise), g.do('k', () => d.promise)];
      d.reject(err);
      for (const p of ps) await expect(p).toReject((e) => e === err);
    },
  },
  {
    group: G1,
    title: 'a sync throw from fn becomes a rejection',
    async run({ Group }, { expect }) {
      const g = new Group<string>();
      await expect(g.do('k', () => { throw new Error('sync'); })).toReject('sync');
    },
  },
  {
    group: G1,
    title: 'without ttl, a call after settling runs fn again',
    async run({ Group }, { expect }) {
      const g = new Group<number>();
      let calls = 0;
      await g.do('k', () => ++calls);
      expect(await g.do('k', () => ++calls)).toBe(2);
    },
  },
  {
    group: G1,
    title: 'keys 1 and "1" are the same key',
    async run({ Group }, { expect, deferred }) {
      const g = new Group<string>();
      const d = deferred<string>();
      let calls = 0;
      const a = g.do(1, () => { calls++; return d.promise; });
      const b = g.do('1', () => { calls++; return d.promise; });
      d.resolve('one');
      expect(await Promise.all([a, b])).toEqual(['one', 'one']);
      expect(calls, 'fn calls').toBe(1);
    },
  },
  {
    group: G2,
    title: 'ttl: cached result served until its age reaches ttl',
    input: 'ttl 1000; resolve at t=0; calls at t=999 and t=1000',
    async run({ Group }, { expect, clock }) {
      const c = clock();
      const g = new Group<number>({ ttl: 1000, clock: c });
      let calls = 0;
      const fn = () => ++calls;
      await g.do('k', fn);
      c.tick(999);
      expect(await g.do('k', fn), 'at 999 ms').toBe(1);
      c.tick(1);
      expect(await g.do('k', fn), 'at 1000 ms').toBe(2);
    },
  },
  {
    group: G2,
    title: 'ttl age counts from when the call resolved',
    async run({ Group }, { expect, clock, deferred }) {
      const c = clock();
      const g = new Group<string>({ ttl: 100, clock: c });
      const d = deferred<string>();
      const p = g.do('k', () => d.promise);
      c.tick(500);
      d.resolve('v'); await p;
      c.tick(99);
      let called = false;
      expect(await g.do('k', () => { called = true; return 'new'; })).toBe('v');
      expect(called, 'fn called').toBe(false);
    },
  },
  {
    group: G2,
    title: 'errors are never cached',
    async run({ Group }, { expect, clock }) {
      const g = new Group<string>({ ttl: 10_000, clock: clock() });
      await expect(g.do('k', async () => { throw new Error('flaky'); })).toReject('flaky');
      expect(await g.do('k', async () => 'recovered')).toBe('recovered');
    },
  },
  {
    group: G3,
    title: 'forget during a call: waiters get the old result, next caller starts fresh',
    async run({ Group }, { expect, deferred }) {
      const g = new Group<string>();
      const old = deferred<string>();
      const a = g.do('k', () => old.promise);
      g.forget('k');
      const b = g.do('k', async () => 'fresh');
      old.resolve('old');
      expect(await a, 'waiter from before forget').toBe('old');
      expect(await b, 'caller after forget').toBe('fresh');
    },
  },
  {
    group: G3,
    title: 'forget drops the cached value',
    async run({ Group }, { expect, clock }) {
      const g = new Group<number>({ ttl: 10_000, clock: clock() });
      let calls = 0;
      await g.do('k', () => ++calls);
      g.forget('k');
      expect(await g.do('k', () => ++calls)).toBe(2);
    },
  },
  {
    group: G3,
    title: 'a call forgotten mid-flight does not land in the cache',
    async run({ Group }, { expect, clock, deferred }) {
      const g = new Group<string>({ ttl: 10_000, clock: clock() });
      const old = deferred<string>();
      const a = g.do('k', () => old.promise);
      g.forget('k');
      old.resolve('old'); await a;
      expect(await g.do('k', async () => 'fresh')).toBe('fresh');
    },
  },
  {
    group: G4,
    title: 'stale value is returned at once and refreshed in the background',
    input: 'ttl 1000, staleAfter 100; cached "v1" at t=0; call at t=150',
    async run({ Group }, { expect, clock, deferred, flush }) {
      const c = clock();
      const g = new Group<string>({ ttl: 1000, staleAfter: 100, clock: c });
      await g.do('k', async () => 'v1');
      c.tick(150);
      const d = deferred<string>();
      let calls = 0;
      expect(await g.do('k', () => { calls++; return d.promise; }), 'stale call').toBe('v1');
      expect(calls, 'refresh started').toBe(1);
      d.resolve('v2'); await flush();
      expect(await g.do('k', async () => 'never'), 'after refresh').toBe('v2');
    },
  },
  {
    group: G4,
    title: 'below staleAfter there is no refresh',
    async run({ Group }, { expect, clock }) {
      const c = clock();
      const g = new Group<string>({ ttl: 1000, staleAfter: 100, clock: c });
      await g.do('k', async () => 'v1');
      c.tick(99);
      let calls = 0;
      await g.do('k', async () => { calls++; return 'v2'; });
      expect(calls).toBe(0);
    },
  },
  {
    group: G4,
    title: 'only one background refresh at a time',
    async run({ Group }, { expect, clock, deferred }) {
      const c = clock();
      const g = new Group<string>({ ttl: 1000, staleAfter: 100, clock: c });
      await g.do('k', async () => 'v1');
      c.tick(200);
      const d = deferred<string>();
      let calls = 0;
      const fn = () => { calls++; return d.promise; };
      const got = await Promise.all([g.do('k', fn), g.do('k', fn), g.do('k', fn)]);
      expect(got).toEqual(['v1', 'v1', 'v1']);
      expect(calls, 'refresh calls').toBe(1);
      d.resolve('v2');
    },
  },
  {
    group: G4,
    title: 'a failed refresh keeps the old value and the next stale call retries',
    async run({ Group }, { expect, clock, flush }) {
      const c = clock();
      const g = new Group<string>({ ttl: 1000, staleAfter: 100, clock: c });
      await g.do('k', async () => 'v1');
      c.tick(200);
      expect(await g.do('k', async () => { throw new Error('refresh failed'); })).toBe('v1');
      await flush();
      let calls = 0;
      expect(await g.do('k', async () => { calls++; return 'v2'; }), 'still the old value').toBe('v1');
      expect(calls, 'retried refresh').toBe(1);
      await flush();
      expect(await g.do('k', async () => 'never')).toBe('v2');
    },
  },
  {
    group: G4,
    title: 'past ttl a stale value is not served',
    async run({ Group }, { expect, clock }) {
      const c = clock();
      const g = new Group<string>({ ttl: 1000, staleAfter: 100, clock: c });
      await g.do('k', async () => 'v1');
      c.tick(1000);
      expect(await g.do('k', async () => 'v2')).toBe('v2');
    },
  },
];
