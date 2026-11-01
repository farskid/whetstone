import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** A clock you set by hand (no timers). */
function handClock(start = 0) {
  let t = start;
  return {
    set: (v: number) => { t = v; },
    clock: { now: () => t, setTimeout: () => 0, clearTimeout: () => {} },
  };
}

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

export const tests: TestCase<M>[] = [
  {
    group: 'Token bucket',
    title: 'a burst up to capacity, then refill over time',
    run({ TokenBucket }, { expect, clock }) {
      const c = clock();
      const b = new TokenBucket({ capacity: 5, refillPerSec: 2, clock: c });
      expect([1, 2, 3, 4, 5, 6].map(() => b.tryRemove())).toEqual([true, true, true, true, true, false]);
      expect(b.tokens).toBe(0);
      c.tick(250);
      expect(b.tokens, 'fractional refill').toBe(0.5);
      expect(b.tryRemove()).toBe(false);
      c.tick(250);
      expect(b.tryRemove()).toBe(true);
      c.tick(10_000);
      expect(b.tokens, 'never above capacity').toBe(5);
      expect(b.tryRemove(5)).toBe(true);
    },
  },
  {
    group: 'Token bucket',
    title: 'bad counts, n above capacity, and a starting level',
    run({ TokenBucket }, { expect, clock }) {
      const b = new TokenBucket({ capacity: 3, refillPerSec: 1, tokens: 1, clock: clock() });
      expect(b.tokens).toBe(1);
      expect(b.tryRemove(2)).toBe(false);
      expect(b.tryRemove(4), 'can never fit').toBe(false);
      expect(thrown(() => b.tryRemove(0))).toBeInstanceOf(RangeError);
      expect(thrown(() => b.tryRemove(-1))).toBeInstanceOf(RangeError);
      expect(thrown(() => new TokenBucket({ capacity: 0, refillPerSec: 1 }))).toBeInstanceOf(RangeError);
      expect(thrown(() => new TokenBucket({ capacity: 1, refillPerSec: -1 }))).toBeInstanceOf(RangeError);
    },
  },
  {
    group: 'Token bucket',
    title: 'a clock that goes backwards neither refills nor double-counts',
    run({ TokenBucket }, { expect }) {
      const h = handClock(0);
      const b = new TokenBucket({ capacity: 10, refillPerSec: 1, tokens: 0, clock: h.clock });
      h.set(1500);
      expect(b.tokens).toBe(1.5);
      h.set(1000);
      expect(b.tokens).toBe(1.5);
      h.set(1500);
      expect(b.tokens, 'time already counted').toBe(1.5);
      h.set(2000);
      expect(b.tokens).toBe(2);
    },
  },
  {
    group: 'Per-key limiters',
    title: 'buckets are created per key on first use',
    run({ createKeyedLimiter }, { expect, clock }) {
      const l = createKeyedLimiter({ capacity: 2, refillPerSec: 1, clock: clock() });
      expect(l.size).toBe(0);
      expect([l.tryRemove('a'), l.tryRemove('a'), l.tryRemove('a'), l.tryRemove('b')]).toEqual([true, true, false, true]);
      expect([l.tokens('a'), l.tokens('b'), l.tokens('new')]).toEqual([0, 1, 2]);
      expect(l.size, 'tokens() does not create a bucket').toBe(2);
    },
  },
  {
    group: 'Per-key limiters',
    title: 'idle buckets are evicted',
    run({ createKeyedLimiter }, { expect, clock }) {
      const c = clock();
      const l = createKeyedLimiter({ capacity: 2, refillPerSec: 1, clock: c });
      l.tryRemove('a', 2);
      c.tick(1000);
      l.tryRemove('b');
      c.tick(999);
      expect(l.size, 'a was used 1999 ms ago; the default idle time is the 2000 ms full refill').toBe(2);
      c.tick(1);
      expect(l.size).toBe(1);
      c.tick(1000);
      expect(l.size).toBe(0);
      const short = createKeyedLimiter({ capacity: 2, refillPerSec: 1, idleMs: 500, clock: c });
      short.tryRemove('a', 2);
      c.tick(400);
      expect(short.tryRemove('a'), 'still the same, empty bucket').toBe(false);
      c.tick(499);
      expect(short.size, 'the failed call counted as use').toBe(1);
      c.tick(1);
      expect([short.size, short.tokens('a')]).toEqual([0, 2]);
    },
  },
  {
    group: 'Sliding window',
    title: 'counts the previous window by how much of it still overlaps',
    run({ SlidingWindow }, { expect, clock }) {
      const c = clock();
      const w = new SlidingWindow({ limit: 10, windowMs: 1000, clock: c });
      const first = Array.from({ length: 10 }, () => w.hit());
      expect(first.map((r) => r.remaining)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
      expect(first[0]).toEqual({ allowed: true, remaining: 9, resetAt: 1000, retryAfter: 0 });
      expect(w.hit(), 'denied hits are not counted').toEqual({ allowed: false, remaining: 0, resetAt: 1000, retryAfter: 1100 });
      c.tick(1100);
      expect(w.hit(), '10 × 0.9 + 0 + 1 = 10').toEqual({ allowed: true, remaining: 0, resetAt: 2000, retryAfter: 0 });
      expect(w.hit()).toEqual({ allowed: false, remaining: 0, resetAt: 2000, retryAfter: 100 });
      c.tick(500);
      expect(w.hit(3), '10 × 0.4 + 1 + 3 = 8').toEqual({ allowed: true, remaining: 2, resetAt: 2000, retryAfter: 0 });
      c.tick(1500);
      expect(w.hit(10), 'a whole window passed with no hits, so the 4 hits before it no longer count').toEqual({ allowed: true, remaining: 0, resetAt: 4000, retryAfter: 0 });
    },
  },
  {
    group: 'Sliding window',
    title: 'no double burst at a window boundary; a gap clears the history',
    run({ SlidingWindow }, { expect, clock }) {
      const c = clock();
      const w = new SlidingWindow({ limit: 10, windowMs: 1000, clock: c });
      c.tick(999);
      expect(w.hit(10).allowed).toBe(true);
      c.tick(1);
      expect(w.hit(), 'the whole previous window still counts at its end').toEqual({ allowed: false, remaining: 0, resetAt: 2000, retryAfter: 100 });
      c.tick(2500);
      expect(w.hit(10), 'two windows later nothing is left').toEqual({ allowed: true, remaining: 0, resetAt: 4000, retryAfter: 0 });
      expect(thrown(() => w.hit(11))).toBeInstanceOf(RangeError);
    },
  },
  {
    group: 'Sliding window',
    title: 'retryAfter can land in the next window',
    run({ SlidingWindow }, { expect, clock }) {
      const c = clock();
      const w = new SlidingWindow({ limit: 4, windowMs: 1000, clock: c });
      c.tick(200);
      w.hit(4);
      const r = w.hit(2);
      expect(r, 'needs 4 × (1 − s) + 2 ≤ 4, so s = 0.5 into the next window').toEqual({ allowed: false, remaining: 0, resetAt: 1000, retryAfter: 1300 });
      c.tick(1300);
      expect(w.hit(2).allowed).toBe(true);
    },
  },
  {
    group: 'Waiting in line',
    title: 'removeTokens waits in FIFO order, and tryRemove does not cut in',
    async run({ TokenBucket }, { expect, clock }) {
      const c = clock();
      const b = new TokenBucket({ capacity: 4, refillPerSec: 1, tokens: 0, clock: c });
      const log: string[] = [];
      b.removeTokens(2).then(() => log.push(`a@${c.now()}`));
      b.removeTokens(1).then(() => log.push(`b@${c.now()}`));
      await c.advance(1000);
      expect(b.tryRemove(1), 'someone is already waiting').toBe(false);
      await c.advance(2000);
      expect(log).toEqual(['a@2000', 'b@3000']);
      expect(c.pendingTimers()).toBe(0);
      await c.advance(1000);
      await b.removeTokens(1);
      expect([c.now(), c.pendingTimers()], 'no wait when tokens are there').toEqual([4000, 0]);
      const err = await b.removeTokens(5).then(() => null, (e: unknown) => e);
      expect(err, 'more than capacity can never succeed').toBeInstanceOf(RangeError);
    },
  },
  {
    group: 'Waiting in line',
    title: 'an aborted waiter leaves the line and lets the next one through',
    async run({ TokenBucket }, { expect, clock }) {
      const c = clock();
      const b = new TokenBucket({ capacity: 4, refillPerSec: 1, tokens: 0, clock: c });
      const ac = new AbortController();
      const log: string[] = [];
      b.removeTokens(3, { signal: ac.signal }).then(() => log.push('big'), (e: unknown) => log.push(`big aborted: ${e}`));
      b.removeTokens(1).then(() => log.push(`small@${c.now()}`));
      await c.advance(1000);
      b.removeTokens(1).then(() => log.push(`third@${c.now()}`));
      await c.advance(0);
      expect(log, 'small and third are behind big, even with a token available').toEqual([]);
      ac.abort('user left');
      await c.advance(0);
      expect(log).toEqual(['big aborted: user left', 'small@1000']);
      expect(b.tokens).toBe(0);
      await c.advance(1000);
      expect(log.slice(2)).toEqual(['third@2000']);
      const done = new AbortController();
      done.abort('already');
      expect(await b.removeTokens(1, { signal: done.signal }).then(() => 'ok', (e: unknown) => e)).toBe('already');
      expect(c.pendingTimers()).toBe(0);
    },
  },
];
