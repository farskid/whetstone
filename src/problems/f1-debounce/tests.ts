import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Trailing debounce';
const G2 = 'Leading and trailing';
const G3 = 'cancel() and pending()';

/** A spy that records each call's args and `this`. */
function spy() {
  const calls: unknown[][] = [];
  const thisArgs: unknown[] = [];
  const fn = function (this: unknown, ...args: unknown[]) { calls.push(args); thisArgs.push(this); };
  return { fn, calls, thisArgs };
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
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
    group: G1,
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
    group: G1,
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
    group: G1,
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
    group: G1,
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
    group: G1,
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
    group: G1,
    title: 'no calls means fn never runs and no timer is left',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      debounce(s.fn, 100, { clock: c });
      c.tick(1000);
      expect(s.calls.length, 'calls').toBe(0);
      expect(c.pendingTimers(), 'timers on the clock').toBe(0);
    },
  },
  {
    group: G1,
    title: 'two debounced functions are independent',
    input: 'd1("a"); d2("b"); advance 100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s1 = spy(); const s2 = spy();
      const d1 = debounce(s1.fn, 100, { clock: c });
      const d2 = debounce(s2.fn, 100, { clock: c });
      d1('a'); d2('b');
      c.tick(100);
      expect(s1.calls, 'd1 calls').toEqual([['a']]);
      expect(s2.calls, 'd2 calls').toEqual([['b']]);
    },
  },
  {
    group: G2,
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
    group: G2,
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
    group: G2,
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
    group: G2,
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
    group: G2,
    title: 'trailing undefined (or left out) counts as true',
    input: '{ leading: true, trailing: undefined }; d(1); d(2)',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, { leading: true, trailing: undefined, clock: c });
      d(1); d(2);
      expect(s.calls, 'leading call right away').toEqual([[1]]);
      c.tick(100);
      expect(s.calls, 'trailing still runs').toEqual([[1], [2]]);
    },
  },
  {
    group: G3,
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
    group: G3,
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
    group: G3,
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
