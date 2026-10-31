import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

/** A spy that records each call's args and `this`. */
function spy() {
  const calls: unknown[][] = [];
  const thisArgs: unknown[] = [];
  const fn = function (this: unknown, ...args: unknown[]) { calls.push(args); thisArgs.push(this); };
  return { fn, calls, thisArgs };
}

export const tests: TestCase<M>[] = [
  {
    title: 'trailing: calls fn once, wait ms after the call',
    input: 'debounce(fn, 100); d("a"); advance 99, then 1',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      d('a');
      expect(s.calls.length, 'calls right after d()').toBe(0);
      c.tick(99);
      expect(s.calls.length, 'calls at 99 ms').toBe(0);
      c.tick(1);
      expect(s.calls).toEqual([['a']]);
    },
  },
  {
    title: 'a burst of calls fires once with the latest args',
    input: 'd(1); d(2); d(3) at 0 ms, wait 100',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      d(1); d(2); d(3, 'x');
      c.tick(100);
      expect(s.calls).toEqual([[3, 'x']]);
    },
  },
  {
    title: 'every call restarts the timer',
    input: 'wait 100; calls at 0, 80, 160 → fires at 260',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      d('a'); c.tick(80);
      d('b'); c.tick(80);
      d('c'); c.tick(99);
      expect(s.calls.length, 'calls at 259 ms').toBe(0);
      c.tick(1);
      expect(s.calls).toEqual([['c']]);
    },
  },
  {
    title: 'keeps `this` from the latest call',
    input: 'obj.save = debounce(fn, 50); obj.save()',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const obj = { name: 'obj', save: debounce(s.fn, 50, { clock: c }) };
      obj.save();
      c.tick(50);
      expect(s.thisArgs[0], '`this` inside fn').toBe(obj);
    },
  },
  {
    title: 'separate bursts fire separately',
    input: 'd("a"); +100 ms; d("b"); +100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      d('a'); c.tick(100);
      d('b'); c.tick(100);
      expect(s.calls).toEqual([['a'], ['b']]);
    },
  },
  {
    title: 'wait 0 still runs on a timer, not synchronously',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 0, { clock: c });
      d('a');
      expect(s.calls.length, 'calls right after d()').toBe(0);
      c.tick(0);
      expect(s.calls).toEqual([['a']]);
    },
  },
  {
    title: 'leading only: fires immediately, once per burst',
    input: '{ leading: true, trailing: false }; d(1); d(2); d(3)',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, trailing: false, clock: c });
      d(1);
      expect(s.calls, 'right after the first call').toEqual([[1]]);
      d(2); c.tick(50); d(3); c.tick(100);
      expect(s.calls, 'after the burst ends').toEqual([[1]]);
    },
  },
  {
    title: 'leading only: a new burst fires again',
    input: 'd(1); +100 ms; d(2)',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, trailing: false, clock: c });
      d(1); c.tick(100);
      d(2);
      expect(s.calls).toEqual([[1], [2]]);
    },
  },
  {
    title: 'leading + trailing, single call: fires once',
    input: '{ leading: true, trailing: true }; d("only")',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, trailing: true, clock: c });
      d('only');
      c.tick(500);
      expect(s.calls).toEqual([['only']]);
    },
  },
  {
    title: 'leading + trailing, burst: first args now, last args at the end',
    input: 'd(1); d(2); d(3)',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, trailing: true, clock: c });
      d(1); d(2); d(3);
      expect(s.calls, 'right away').toEqual([[1]]);
      c.tick(100);
      expect(s.calls, 'after the burst').toEqual([[1], [3]]);
    },
  },
  {
    title: 'cancel() drops the scheduled call',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      d('a'); c.tick(50);
      d.cancel();
      c.tick(1000);
      expect(s.calls.length, 'calls after cancel').toBe(0);
      expect(c.pendingTimers(), 'timers left on the clock').toBe(0);
    },
  },
  {
    title: 'after cancel() the next call starts a fresh burst',
    input: 'leading + trailing; d(1); d(2); cancel(); d(3)',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, clock: c });
      d(1); d(2);
      d.cancel();
      d(3);
      expect(s.calls, 'd(3) is a new leading call').toEqual([[1], [3]]);
      c.tick(100);
      expect(s.calls, 'nothing trailing after a single-call burst').toEqual([[1], [3]]);
    },
  },
  {
    title: 'pending() tracks the scheduled trailing call',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { clock: c });
      expect(d.pending(), 'before any call').toBe(false);
      d('a');
      expect(d.pending(), 'after d()').toBe(true);
      c.tick(100);
      expect(d.pending(), 'after it fired').toBe(false);
      d('b'); d.cancel();
      expect(d.pending(), 'after cancel()').toBe(false);
    },
  },
];
