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
    title: 'does not call fn right away',
    input: 'd = debounce(fn, 100); d("a")',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d('a');
      expect(s.calls.length, 'calls right after d()').toBe(0);
    },
  },
  {
    title: 'calls fn once after wait ms',
    input: 'd("a"); advance 99 ms, then 1 ms more',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d('a');
      c.tick(99);
      expect(s.calls.length, 'calls at 99 ms').toBe(0);
      c.tick(1);
      expect(s.calls).toEqual([['a']]);
    },
  },
  {
    title: 'a burst of calls fires fn only once',
    input: 'd(1); d(2); d(3); advance 100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d(1); d(2); d(3);
      c.tick(100);
      expect(s.calls.length, 'number of calls').toBe(1);
    },
  },
  {
    title: 'uses the latest arguments',
    input: 'd(1); d(2); d(3, "x"); advance 100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d(1); d(2); d(3, 'x');
      c.tick(100);
      expect(s.calls).toEqual([[3, 'x']]);
    },
  },
  {
    title: 'every call restarts the timer',
    input: 'wait 100; calls at 0, 80 and 160 ms → fires at 260 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d('a'); c.tick(80);
      d('b'); c.tick(80);
      d('c'); c.tick(99);
      expect(s.calls.length, 'calls at 259 ms').toBe(0);
      c.tick(1);
      expect(s.calls).toEqual([['c']]);
    },
  },
  {
    title: 'calls spaced out by wait each fire',
    input: 'd("a"); +100 ms; d("b"); +100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 100, c);
      d('a'); c.tick(100);
      d('b'); c.tick(100);
      expect(s.calls).toEqual([['a'], ['b']]);
    },
  },
  {
    title: 'keeps `this` from the call',
    input: 'obj.save = debounce(fn, 50); obj.save()',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const obj = { name: 'obj', save: debounce(s.fn, 50, c) };
      obj.save();
      c.tick(50);
      expect(s.thisArgs[0], '`this` inside fn').toBe(obj);
    },
  },
  {
    title: 'wait 0 still waits for the timer',
    input: 'debounce(fn, 0); d("a")',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      const d = debounce(s.fn, 0, c);
      d('a');
      expect(s.calls.length, 'calls right after d()').toBe(0);
      c.tick(0);
      expect(s.calls).toEqual([['a']]);
    },
  },
  {
    title: 'no calls means fn never runs and no timer is left',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s = spy();
      debounce(s.fn, 100, c);
      c.tick(1000);
      expect(s.calls.length, 'calls').toBe(0);
      expect(c.pendingTimers(), 'timers on the clock').toBe(0);
    },
  },
  {
    title: 'two debounced functions are independent',
    input: 'd1("a"); d2("b"); advance 100 ms',
    run({ debounce }, { expect, clock }) {
      const c = clock(); const s1 = spy(); const s2 = spy();
      const d1 = debounce(s1.fn, 100, c);
      const d2 = debounce(s2.fn, 100, c);
      d1('a'); d2('b');
      c.tick(100);
      expect(s1.calls, 'd1 calls').toEqual([['a']]);
      expect(s2.calls, 'd2 calls').toEqual([['b']]);
    },
  },
];
