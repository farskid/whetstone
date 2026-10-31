import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** Runs body with the built-in Promise.allSettled disabled. */
async function withoutBuiltin<T>(body: () => Promise<T>): Promise<T> {
  const P = Promise as any;
  const original = P.allSettled;
  P.allSettled = () => { throw new Error('Do not call the built-in Promise.allSettled'); };
  try { return await body(); } finally { P.allSettled = original; }
}

export const tests: TestCase<M>[] = [
  {
    title: 'empty array resolves with []',
    input: 'allSettled([])',
    async run({ allSettled }, { expect }) {
      const p = allSettled([]);
      expect(p instanceof Promise, 'returns a Promise').toBe(true);
      expect(await p).toEqual([]);
    },
  },
  {
    title: 'all fulfilled: values in input order',
    input: 'allSettled([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])',
    async run({ allSettled }, { expect }) {
      expect(await allSettled([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)])).toEqual([
        { status: 'fulfilled', value: 1 },
        { status: 'fulfilled', value: 2 },
        { status: 'fulfilled', value: 3 },
      ]);
    },
  },
  {
    title: 'rejections become { status: "rejected", reason }',
    input: 'allSettled([Promise.resolve("a"), Promise.reject(err)])',
    async run({ allSettled }, { expect }) {
      const err = new Error('boom');
      const out = await allSettled([Promise.resolve('a'), Promise.reject(err)]);
      expect(out[0]).toEqual({ status: 'fulfilled', value: 'a' });
      expect(out[1].status).toBe('rejected');
      expect((out[1] as any).reason, 'reason is the same Error object').toBe(err);
    },
  },
  {
    title: 'never rejects, even when every input rejects',
    input: 'allSettled([reject("x"), reject("y")])',
    async run({ allSettled }, { expect }) {
      const out = await expect(allSettled([Promise.reject('x'), Promise.reject('y')])).toResolve();
      expect(out).toEqual([{ status: 'rejected', reason: 'x' }, { status: 'rejected', reason: 'y' }]);
    },
  },
  {
    title: 'keeps input order when inputs settle out of order',
    input: '3 deferreds settled as 3rd, 1st, 2nd',
    async run({ allSettled }, { expect, deferred, flush }) {
      const [a, b, c] = [deferred<string>(), deferred<string>(), deferred<string>()];
      const p = allSettled([a.promise, b.promise, c.promise]);
      c.resolve('c'); await flush();
      a.reject('a failed'); await flush();
      b.resolve('b');
      expect(await p).toEqual([
        { status: 'rejected', reason: 'a failed' },
        { status: 'fulfilled', value: 'b' },
        { status: 'fulfilled', value: 'c' },
      ]);
    },
  },
  {
    title: 'waits for the slowest input before resolving',
    async run({ allSettled }, { expect, deferred, flush }) {
      const slow = deferred<number>();
      let done = false;
      const p = allSettled([Promise.resolve(1), slow.promise]).then((r) => { done = true; return r; });
      await flush(); await flush();
      expect(done, 'resolved before the slow input settled').toBe(false);
      slow.resolve(2);
      expect(await p).toEqual([{ status: 'fulfilled', value: 1 }, { status: 'fulfilled', value: 2 }]);
    },
  },
  {
    title: 'plain values count as fulfilled',
    input: 'allSettled([1, "two", null, undefined, { x: 1 }])',
    async run({ allSettled }, { expect }) {
      expect(await allSettled<unknown>([1, 'two', null, undefined, { x: 1 }])).toEqual([
        { status: 'fulfilled', value: 1 },
        { status: 'fulfilled', value: 'two' },
        { status: 'fulfilled', value: null },
        { status: 'fulfilled', value: undefined },
        { status: 'fulfilled', value: { x: 1 } },
      ]);
    },
  },
  {
    title: 'thenables are adopted (fulfil and reject)',
    input: '{ then(res) { res(7) } }, { then(_, rej) { rej("no") } }',
    async run({ allSettled }, { expect }) {
      const good = { then(res: (v: number) => void) { res(7); } } as PromiseLike<number>;
      const bad = { then(_: unknown, rej: (r: unknown) => void) { rej('no'); } } as PromiseLike<number>;
      expect(await allSettled([good, bad])).toEqual([
        { status: 'fulfilled', value: 7 },
        { status: 'rejected', reason: 'no' },
      ]);
    },
  },
  {
    title: 'reason is kept as-is (undefined, strings, objects)',
    async run({ allSettled }, { expect }) {
      const obj = { code: 42 };
      const out = await allSettled([Promise.reject(undefined), Promise.reject('str'), Promise.reject(obj)]);
      expect(out.map((r) => r.status)).toEqual(['rejected', 'rejected', 'rejected']);
      expect((out[0] as any).reason, 'reason 0').toBeUndefined();
      expect((out[1] as any).reason, 'reason 1').toBe('str');
      expect((out[2] as any).reason, 'reason 2 (same object)').toBe(obj);
    },
  },
  {
    title: 'result objects have exactly the right keys',
    async run({ allSettled }, { expect }) {
      const [f, r] = await allSettled([1, Promise.reject('e')]);
      expect(Object.keys(f).sort(), 'fulfilled keys').toEqual(['status', 'value']);
      expect(Object.keys(r).sort(), 'rejected keys').toEqual(['reason', 'status']);
    },
  },
  {
    title: 'accepts any iterable (Set and generator)',
    async run({ allSettled }, { expect }) {
      expect(await allSettled(new Set([1, 2]))).toEqual([
        { status: 'fulfilled', value: 1 },
        { status: 'fulfilled', value: 2 },
      ]);
      function* gen() { yield 'a'; yield Promise.reject('b'); }
      expect(await allSettled(gen())).toEqual([
        { status: 'fulfilled', value: 'a' },
        { status: 'rejected', reason: 'b' },
      ]);
    },
  },
  {
    title: 'works without the built-in Promise.allSettled',
    input: 'Promise.allSettled replaced with a function that throws',
    async run({ allSettled }, { expect }) {
      const out = await withoutBuiltin(() => allSettled([1, Promise.reject('x'), Promise.resolve(3)]));
      expect(out).toEqual([
        { status: 'fulfilled', value: 1 },
        { status: 'rejected', reason: 'x' },
        { status: 'fulfilled', value: 3 },
      ]);
    },
  },
];
