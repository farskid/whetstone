import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Retry until success';
const G2 = 'Exponential backoff';
const G3 = 'Stopping early';
const G4 = 'Abort and hooks';

/** fn that fails `failures` times (with Error('fail N')) and then resolves 'ok'. Records attempts and call times. */
function flaky(failures: number, now: () => number = () => 0) {
  const attempts: number[] = [];
  const times: number[] = [];
  const fn = (attempt: number) => {
    attempts.push(attempt); times.push(now());
    if (attempts.length <= failures) throw new Error(`fail ${attempts.length}`);
    return 'ok';
  };
  return { fn, attempts, times };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'resolves on the first try with attempt = 1',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(0);
      expect(await retry(f.fn, { clock: c })).toBe('ok');
      expect(f.attempts).toEqual([1]);
    },
  },
  {
    group: G1,
    title: 'retries until fn succeeds, passing the attempt number',
    input: 'fails twice, then resolves; minTimeout 10',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(2);
      const p = retry(f.fn, { minTimeout: 10, clock: c });
      await c.runAll();
      expect(await p).toBe('ok');
      expect(f.attempts).toEqual([1, 2, 3]);
    },
  },
  {
    group: G1,
    title: 'rejects with the last error after retries + 1 calls',
    input: 'always fails; retries 3',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      const p = retry(f.fn, { retries: 3, minTimeout: 1, clock: c });
      p.catch(() => {});
      await c.runAll();
      await expect(p).toReject('fail 4');
      expect(f.attempts.length, 'calls').toBe(4);
    },
  },
  {
    group: G1,
    title: 'retries: 0 means exactly one call',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      await expect(retry(f.fn, { retries: 0, clock: c })).toReject('fail 1');
      expect(f.attempts.length, 'calls').toBe(1);
      expect(c.pendingTimers(), 'timers left').toBe(0);
    },
  },
  {
    group: G1,
    title: 'async rejections count like sync throws',
    async run({ retry }, { expect, clock }) {
      const c = clock(); let n = 0;
      const p = retry(async () => { if (++n < 3) throw new Error('nope'); return n; }, { minTimeout: 5, clock: c });
      await c.runAll();
      expect(await p).toBe(3);
    },
  },
  {
    group: G1,
    title: 'non-Error throws are wrapped in a TypeError',
    input: 'fn throws the string "bad"; retries 0',
    async run({ retry }, { expect, clock }) {
      const c = clock();
      await expect(retry(() => { throw 'bad'; }, { retries: 0, clock: c }))
        .toReject((e) => e instanceof TypeError && e.message === 'Non-error was thrown: bad');
    },
  },
  {
    group: G2,
    title: 'waits minTimeout * factor^(n-1) between attempts',
    input: 'minTimeout 100, factor 2, fails 3 times → waits 100, 200, 400',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(3, c.now);
      const p = retry(f.fn, { minTimeout: 100, factor: 2, clock: c });
      await c.runAll();
      await p;
      expect(f.times, 'call times (ms)').toEqual([0, 100, 300, 700]);
    },
  },
  {
    group: G2,
    title: 'does not call fn again before the wait is over',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(1, c.now);
      const p = retry(f.fn, { minTimeout: 100, clock: c });
      await c.advance(99);
      expect(f.attempts.length, 'calls at 99 ms').toBe(1);
      await c.advance(1);
      expect(await p).toBe('ok');
    },
  },
  {
    group: G2,
    title: 'waits are capped at maxTimeout',
    input: 'minTimeout 100, factor 3, maxTimeout 500, fails 4 times → 100, 300, 500, 500',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(4, c.now);
      const p = retry(f.fn, { minTimeout: 100, factor: 3, maxTimeout: 500, clock: c });
      await c.runAll();
      await p;
      expect(f.times).toEqual([0, 100, 400, 900, 1400]);
    },
  },
  {
    group: G2,
    title: 'randomize multiplies the capped wait by random()',
    input: 'minTimeout 100, factor 2, maxTimeout 150, random() = 0.5 → waits 50, 75',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(2, c.now);
      const p = retry(f.fn, { minTimeout: 100, maxTimeout: 150, randomize: true, random: () => 0.5, clock: c });
      await c.runAll();
      await p;
      expect(f.times).toEqual([0, 50, 125]);
    },
  },
  {
    group: G3,
    title: 'shouldRetry returning false stops with that error',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      const seen: string[] = [];
      const p = retry(f.fn, { minTimeout: 1, clock: c, shouldRetry: (e) => { seen.push(e.message); return e.message !== 'fail 2'; } });
      p.catch(() => {});
      await c.runAll();
      await expect(p).toReject('fail 2');
      expect(seen).toEqual(['fail 1', 'fail 2']);
    },
  },
  {
    group: G3,
    title: 'async shouldRetry is awaited',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      await expect(retry(f.fn, { clock: c, shouldRetry: async () => false })).toReject('fail 1');
      expect(f.attempts.length, 'calls').toBe(1);
    },
  },
  {
    group: G3,
    title: 'throwing AbortError(err) stops at once and rejects with err',
    async run({ retry, AbortError }, { expect, clock }) {
      const c = clock();
      const original = new Error('404');
      let hookCalls = 0;
      await expect(retry(() => { throw new AbortError(original); }, { clock: c, onFailedAttempt: () => { hookCalls++; } }))
        .toReject((e) => e === original);
      expect(hookCalls, 'onFailedAttempt calls').toBe(0);
    },
  },
  {
    group: G3,
    title: 'AbortError("msg") rejects with the AbortError itself',
    async run({ retry, AbortError }, { expect, clock }) {
      await expect(retry(() => { throw new AbortError('stop'); }, { clock: clock() }))
        .toReject((e) => e instanceof AbortError && (e as Error).name === 'AbortError' && (e as Error).message === 'stop');
    },
  },
  {
    group: G4,
    title: 'onFailedAttempt gets { error, attempt, retriesLeft } for every failure',
    input: 'retries 2, always fails',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      const info: unknown[] = [];
      const p = retry(f.fn, { retries: 2, minTimeout: 1, clock: c, onFailedAttempt: ({ error, attempt, retriesLeft }) => { info.push([error.message, attempt, retriesLeft]); } });
      p.catch(() => {});
      await c.runAll();
      await expect(p).toReject('fail 3');
      expect(info).toEqual([['fail 1', 1, 2], ['fail 2', 2, 1], ['fail 3', 3, 0]]);
    },
  },
  {
    group: G4,
    title: 'onFailedAttempt throwing stops with its error',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      await expect(retry(f.fn, { clock: c, onFailedAttempt: () => { throw new Error('hook says stop'); } })).toReject('hook says stop');
      expect(f.attempts.length, 'calls').toBe(1);
    },
  },
  {
    group: G4,
    title: 'abort during a backoff wait rejects at once and clears the timer',
    async run({ retry }, { expect, clock }) {
      const c = clock(); const f = flaky(99);
      const ac = new AbortController();
      const p = retry(f.fn, { minTimeout: 10_000, signal: ac.signal, clock: c });
      p.catch(() => {});
      await c.advance(10);
      const reason = new Error('user cancelled');
      ac.abort(reason);
      await expect(p).toReject((e) => e === reason);
      expect(c.pendingTimers(), 'timers left').toBe(0);
      expect(f.attempts.length, 'calls').toBe(1);
    },
  },
  {
    group: G4,
    title: 'an already-aborted signal never calls fn',
    async run({ retry }, { expect, clock }) {
      const ac = new AbortController(); ac.abort('gone');
      let calls = 0;
      await expect(retry(() => { calls++; return 1; }, { signal: ac.signal, clock: clock() })).toReject((e) => e === 'gone');
      expect(calls).toBe(0);
    },
  },
];
