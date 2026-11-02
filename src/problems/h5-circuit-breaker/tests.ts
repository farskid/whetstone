import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** A service: call('ok', x) resolves x, call('fail') rejects, call('hang') waits for release(). */
function service() {
  const calls: string[] = [];
  const pending: { resolve: (v: string) => void; reject: (e: Error) => void }[] = [];
  const fn = (mode: string, value = mode): Promise<string> => {
    calls.push(mode);
    if (mode === 'throw') throw new Error('sync boom');
    if (mode === 'fail') return Promise.reject(new Error(`boom:${value}`));
    if (mode === 'hang') return new Promise((resolve, reject) => pending.push({ resolve, reject }));
    if (mode === 'bad-input') return Promise.reject(Object.assign(new Error('400'), { status: 400 }));
    return Promise.resolve(value);
  };
  return { calls, pending, fn };
}

const settle = (p: Promise<unknown>) => p.then((v) => ({ ok: v }), (e: Error) => ({ err: e.name === 'Error' ? e.message : e.name }));

export const tests: TestCase<M>[] = [
  {
    group: 'Failing fast',
    title: 'passes calls through, then opens after 5 failures in a row',
    async run({ CircuitBreaker, OpenCircuitError }, { expect, clock }) {
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: clock() });
      expect(await b.fire('ok', 'hello')).toBe('hello');
      for (let i = 0; i < 4; i++) await settle(b.fire('fail', String(i)));
      expect(b.state).toBe('closed');
      expect(await settle(b.fire('fail', '4')), 'the caller gets the real error').toEqual({ err: 'boom:4' });
      expect(b.state).toBe('open');
      let caught: unknown;
      await b.fire('ok').catch((e: unknown) => { caught = e; });
      expect(caught).toBeInstanceOf(OpenCircuitError);
      expect(s.calls.length, 'the open breaker did not call the service').toBe(6);
    },
  },
  {
    group: 'Failing fast',
    title: 'a success resets the count; sync throws are failures',
    async run({ CircuitBreaker }, { expect, clock }) {
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: clock(), failureThreshold: 3 });
      for (const m of ['fail', 'fail', 'ok', 'fail', 'fail']) await settle(b.fire(m));
      expect(b.state).toBe('closed');
      expect(await settle(b.fire('throw'))).toEqual({ err: 'sync boom' });
      expect(b.state).toBe('open');
    },
  },
  {
    group: 'Half-open',
    title: 'after resetTimeout one trial call can close it',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 1, resetTimeout: 5000 });
      await settle(b.fire('fail'));
      c.tick(4999);
      expect(b.state).toBe('open');
      c.tick(1);
      expect(b.state).toBe('halfOpen');
      expect(await b.fire('ok', 'trial')).toBe('trial');
      expect(b.state).toBe('closed');
      expect(c.pendingTimers()).toBe(0);
    },
  },
  {
    group: 'Half-open',
    title: 'a failed trial reopens it for another full resetTimeout',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 2, resetTimeout: 1000 });
      await settle(b.fire('fail'));
      await settle(b.fire('fail'));
      c.tick(1000);
      expect(await settle(b.fire('fail', 'trial'))).toEqual({ err: 'boom:trial' });
      expect(b.state, 'one failure is enough while half-open').toBe('open');
      c.tick(999);
      expect(await settle(b.fire('ok'))).toEqual({ err: 'OpenCircuitError' });
      c.tick(1);
      expect(b.state).toBe('halfOpen');
      await b.fire('ok');
      await settle(b.fire('fail'));
      expect(b.state, 'closed again with a fresh count').toBe('closed');
    },
  },
  {
    group: 'Half-open',
    title: 'only halfOpenMax trials at once; the first result decides',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 1, resetTimeout: 100, halfOpenMax: 2 });
      await settle(b.fire('fail'));
      c.tick(100);
      const a = settle(b.fire('hang'));
      const d = settle(b.fire('hang'));
      expect(await settle(b.fire('ok')), 'a third trial is turned away').toEqual({ err: 'OpenCircuitError' });
      expect(s.calls).toEqual(['fail', 'hang', 'hang']);
      s.pending[1].resolve('second');
      expect(await d).toEqual({ ok: 'second' });
      expect(b.state).toBe('closed');
      s.pending[0].reject(new Error('late'));
      expect(await a).toEqual({ err: 'late' });
      expect(b.state, 'a trial that finishes after the breaker closed does not count').toBe('closed');
      const one = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 1, resetTimeout: 100 });
      await settle(one.fire('fail'));
      c.tick(100);
      const t = settle(one.fire('hang'));
      expect(await settle(one.fire('ok')), 'default halfOpenMax is 1').toEqual({ err: 'OpenCircuitError' });
      s.pending[2].reject(new Error('x'));
      await t;
      expect(one.state).toBe('open');
    },
  },
  {
    group: 'Rolling window',
    title: 'opens on the error percentage once there is enough volume',
    async run({ CircuitBreaker }, { expect, clock }) {
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: clock(), window: { durationMs: 10_000, errorPercentage: 50, volumeThreshold: 4 } });
      for (const m of ['fail', 'fail', 'fail']) await settle(b.fire(m));
      expect(b.state, '100% failures but only 3 calls').toBe('closed');
      for (const m of ['ok', 'ok', 'ok', 'ok', 'ok', 'fail']) await settle(b.fire(m));
      expect(b.state, '4 of 9 failed (44%), and there is no failureThreshold by default').toBe('closed');
      await settle(b.fire('ok'));
      await settle(b.fire('fail'));
      expect(b.state, '5 of 11').toBe('closed');
      await settle(b.fire('fail'));
      expect(b.state, '6 of 12 = 50%').toBe('open');
    },
  },
  {
    group: 'Rolling window',
    title: 'calls older than durationMs no longer count',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: c, window: { durationMs: 10_000, errorPercentage: 50, volumeThreshold: 4 } });
      await settle(b.fire('fail'));
      await settle(b.fire('fail'));
      c.tick(10_000);
      for (const m of ['ok', 'ok', 'ok', 'fail']) await settle(b.fire(m));
      expect(b.state, 'only 1 of the last 4 calls failed').toBe('closed');
      const both = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 2, window: { durationMs: 1000, errorPercentage: 90, volumeThreshold: 100 } });
      await settle(both.fire('fail'));
      await settle(both.fire('fail'));
      expect(both.state, 'an explicit failureThreshold still applies').toBe('open');
      const windowOnly = new CircuitBreaker(s.fn, { clock: c, window: { durationMs: 1000, errorPercentage: 90, volumeThreshold: 100 } });
      for (let i = 0; i < 6; i++) await settle(windowOnly.fire('fail'));
      expect(windowOnly.state, 'with a window and no failureThreshold, failures in a row alone never open it').toBe('closed');
    },
  },
  {
    group: 'Rolling window',
    title: 'a timeout counts as a failure',
    async run({ CircuitBreaker, TimeoutError }, { expect, clock }) {
      const c = clock();
      const s = service();
      const b = new CircuitBreaker(s.fn, { clock: c, timeout: 1000, failureThreshold: 2 });
      await b.fire('ok');
      expect(c.pendingTimers(), 'timer cleared after success').toBe(0);
      let caught: unknown;
      const p = b.fire('hang').catch((e: unknown) => { caught = e; });
      await c.advance(999);
      expect(caught).toBe(undefined);
      await c.advance(1);
      await p;
      expect(caught).toBeInstanceOf(TimeoutError);
      s.pending[0].resolve('too late');
      await c.advance(0);
      expect(b.state, 'one failure so far; the late result is ignored').toBe('closed');
      const q = settle(b.fire('hang'));
      await c.advance(1000);
      await q;
      expect(b.state).toBe('open');
    },
  },
  {
    group: 'Fallback and events',
    title: 'fallback answers failures, timeouts and rejections',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const seen: string[] = [];
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 2, timeout: 500 }).fallback((err, mode, value) => {
        seen.push(`${(err as Error).name}:${mode}:${value}`);
        return 'cached';
      });
      const fb: unknown[] = [];
      const ev: string[] = [];
      b.on('fallback', (v) => fb.push(v));
      b.on('timeout', (e) => ev.push(`timeout:${(e as Error).name}`));
      b.on('failure', () => ev.push('failure'));
      expect(await b.fire('ok', 'live')).toBe('live');
      expect(await b.fire('fail', 'a')).toBe('cached');
      const t = b.fire('hang', 'b');
      await c.advance(500);
      expect(await t).toBe('cached');
      expect(b.state).toBe('open');
      expect(await b.fire('ok', 'c')).toBe('cached');
      expect(seen).toEqual(['Error:fail:a', 'TimeoutError:hang:b', 'OpenCircuitError:ok:c']);
      expect(fb).toEqual(['cached', 'cached', 'cached']);
      expect(ev, 'timeout comes just before failure').toEqual(['failure', 'timeout:TimeoutError', 'failure']);
    },
  },
  {
    group: 'Fallback and events',
    title: 'events in order, and unsubscribing',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const log: string[] = [];
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 1, resetTimeout: 10 });
      const events = ['open', 'halfOpen', 'close', 'reject', 'success', 'failure'] as const;
      const offs = events.map((e) => b.on(e, (p) => log.push(p === undefined ? e : `${e}:${p instanceof Error ? p.name : p}`)));
      await b.fire('ok', 'x');
      await settle(b.fire('fail'));
      await settle(b.fire('ok'));
      c.tick(10);
      await b.fire('ok', 'y');
      expect(log).toEqual(['success:x', 'failure:Error', 'open', 'reject:OpenCircuitError', 'halfOpen', 'success:y', 'close']);
      offs.forEach((off) => off());
      await settle(b.fire('fail'));
      expect(log.length, 'no events after unsubscribing').toBe(7);
    },
  },
  {
    group: 'Fallback and events',
    title: 'errorFilter: excluded errors reject but count as a success',
    async run({ CircuitBreaker }, { expect, clock }) {
      const c = clock();
      const s = service();
      const log: string[] = [];
      const b = new CircuitBreaker(s.fn, { clock: c, failureThreshold: 2, resetTimeout: 10, errorFilter: (e) => (e as { status?: number }).status === 400 })
        .fallback(() => 'fallback');
      b.on('failure', () => log.push('failure'));
      expect(await settle(b.fire('bad-input')), 'no fallback for an excluded error').toEqual({ err: '400' });
      await settle(b.fire('fail'));
      await settle(b.fire('bad-input'));
      await settle(b.fire('fail'));
      expect([b.state, log], 'the 400 in between reset the count').toEqual(['closed', ['failure', 'failure']]);
      await settle(b.fire('fail'));
      expect(b.state).toBe('open');
      c.tick(10);
      await settle(b.fire('bad-input'));
      expect(b.state, 'an excluded error on the trial closes the breaker').toBe('closed');
    },
  },
];
