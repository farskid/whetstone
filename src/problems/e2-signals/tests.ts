import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Signal and computed';
const G2 = 'Effects';
const G3 = 'Batching and glitch-free';
const G4 = 'Dynamic deps, untracked, errors, cycles';

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'signal reads and writes .value',
    input: 'const s = signal(1); s.value = 5',
    run({ signal }, { expect }) {
      const s = signal(1);
      expect(s.value).toBe(1);
      s.value = 5;
      expect(s.value).toBe(5);
      expect(s.peek()).toBe(5);
    },
  },
  {
    group: G1,
    title: 'computed derives from signals',
    input: 'a=2, b=3, sum = computed(a + b); then a = 10',
    run({ signal, computed }, { expect }) {
      const a = signal(2), b = signal(3);
      const sum = computed(() => a.value + b.value);
      expect(sum.value).toBe(5);
      a.value = 10;
      expect(sum.value).toBe(13);
    },
  },
  {
    group: G1,
    title: 'computed is lazy: fn does not run until read',
    run({ signal, computed }, { expect }) {
      let calls = 0;
      const a = signal(1);
      const c = computed(() => { calls++; return a.value * 2; });
      expect(calls, 'calls before read').toBe(0);
      a.value = 2;
      expect(calls, 'calls after write, before read').toBe(0);
      expect(c.value).toBe(4);
      expect(calls, 'calls after first read').toBe(1);
    },
  },
  {
    group: G1,
    title: 'computed is cached between reads',
    run({ signal, computed }, { expect }) {
      let calls = 0;
      const a = signal(1);
      const c = computed(() => { calls++; return a.value + 1; });
      c.value; c.value; c.value;
      expect(calls).toBe(1);
      a.value = 5;
      a.value = 6;
      expect(calls, 'writes alone must not recompute').toBe(1);
      expect(c.value).toBe(7);
      expect(calls).toBe(2);
    },
  },
  {
    group: G2,
    title: 'effect runs immediately and re-runs on change',
    run({ signal, effect }, { expect }) {
      const s = signal('a');
      const seen: string[] = [];
      effect(() => { seen.push(s.value); });
      expect(seen).toEqual(['a']);
      s.value = 'b';
      expect(seen).toEqual(['a', 'b']);
    },
  },
  {
    group: G2,
    title: 'writing an equal value does not notify',
    input: 's = signal(NaN); s.value = NaN; s.value = NaN',
    run({ signal, effect }, { expect }) {
      const s = signal(NaN);
      let runs = 0;
      effect(() => { s.value; runs++; });
      s.value = NaN;
      s.value = NaN;
      expect(runs).toBe(1);
    },
  },
  {
    group: G2,
    title: 'dispose stops the effect and runs its cleanup',
    run({ signal, effect }, { expect }) {
      const s = signal(0);
      const log: string[] = [];
      const dispose = effect(() => { log.push(`run ${s.value}`); return () => log.push('cleanup'); });
      dispose();
      s.value = 1;
      dispose();
      expect(log).toEqual(['run 0', 'cleanup']);
    },
  },
  {
    group: G2,
    title: 'cleanup runs before each re-run',
    run({ signal, effect }, { expect }) {
      const s = signal(0);
      const log: string[] = [];
      effect(() => { const v = s.value; log.push(`run ${v}`); return () => log.push(`cleanup ${v}`); });
      s.value = 1;
      s.value = 2;
      expect(log).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1', 'run 2']);
    },
  },
  {
    group: G3,
    title: 'batch runs effects once, after the outermost batch',
    run({ signal, effect, batch }, { expect }) {
      const a = signal(1), b = signal(1);
      const seen: number[] = [];
      effect(() => { seen.push(a.value + b.value); });
      const ret = batch(() => {
        a.value = 2;
        batch(() => { b.value = 3; });
        expect(seen, 'no effect inside batch').toEqual([2]);
        return 'done';
      });
      expect(ret).toBe('done');
      expect(seen).toEqual([2, 5]);
    },
  },
  {
    group: G3,
    title: 'reads inside a batch see fresh values',
    run({ signal, computed, batch }, { expect }) {
      const a = signal(1);
      const c = computed(() => a.value * 10);
      batch(() => {
        a.value = 2;
        expect(a.value).toBe(2);
        expect(c.value).toBe(20);
      });
    },
  },
  {
    group: G3,
    title: 'diamond: computes once, never shows inconsistent state',
    input: 'a → b = a+1, a → c = a*2, d = b + c; effect logs d',
    run({ signal, computed, effect }, { expect }) {
      const a = signal(1);
      let dCalls = 0;
      const b = computed(() => a.value + 1);
      const c = computed(() => a.value * 2);
      const d = computed(() => { dCalls++; return `${b.value}+${c.value}`; });
      const seen: string[] = [];
      effect(() => { seen.push(d.value); });
      a.value = 2;
      a.value = 3;
      expect(seen).toEqual(['2+2', '3+4', '4+6']);
      expect(dCalls).toBe(3);
    },
  },
  {
    group: G3,
    title: 'equality cutoff: unchanged computed does not re-run dependents',
    input: 'parity = computed(n % 2); n: 1 → 3 → 5',
    run({ signal, computed, effect }, { expect }) {
      const n = signal(1);
      const parity = computed(() => n.value % 2);
      let runs = 0;
      effect(() => { parity.value; runs++; });
      n.value = 3;
      n.value = 5;
      expect(runs).toBe(1);
      n.value = 6;
      expect(runs).toBe(2);
    },
  },
  {
    group: G4,
    title: 'dynamic dependencies: a branch switch drops old deps',
    run({ signal, effect }, { expect }) {
      const useA = signal(true), a = signal('a1'), b = signal('b1');
      const seen: string[] = [];
      effect(() => { seen.push(useA.value ? a.value : b.value); });
      useA.value = false;      // now depends on b only
      a.value = 'a2';          // must not re-run
      b.value = 'b2';
      expect(seen).toEqual(['a1', 'b1', 'b2']);
    },
  },
  {
    group: G4,
    title: 'untracked() and peek() do not create dependencies',
    run({ signal, effect, untracked }, { expect }) {
      const tracked = signal(0), quiet = signal(0), quiet2 = signal(0);
      let runs = 0;
      effect(() => { tracked.value; untracked(() => quiet.value); quiet2.peek(); runs++; });
      quiet.value = 1;
      quiet2.value = 1;
      expect(runs).toBe(1);
      tracked.value = 1;
      expect(runs).toBe(2);
      expect(untracked(() => 42)).toBe(42);
    },
  },
  {
    group: G4,
    title: 'a computed that throws re-throws on read, then recovers',
    run({ signal, computed }, { expect }) {
      const s = signal(0);
      const c = computed(() => { if (s.value === 0) throw new Error('zero!'); return 10 / s.value; });
      expect(() => c.value).toThrow('zero!');
      expect(() => c.value).toThrow('zero!');
      s.value = 2;
      expect(c.value).toBe(5);
    },
  },
  {
    group: G4,
    title: 'a computed reading itself throws a Cycle error',
    run({ computed }, { expect }) {
      const a: { value: number } = computed((): number => b.value + 1);
      const b: { value: number } = computed((): number => a.value + 1);
      expect(() => a.value).toThrow(/cycle/i);
    },
  },
  {
    group: G4,
    title: 'an effect writing to a signal it reads settles',
    input: 'effect(() => { if (s.value < 5) s.value++ })',
    run({ signal, effect }, { expect }) {
      const s = signal(0);
      effect(() => { if (s.value < 5) s.value = s.value + 1; });
      expect(s.value).toBe(5);
      s.value = 1;
      expect(s.value).toBe(5);
    },
  },
  {
    group: G4,
    title: 'a runaway effect throws a Cycle error instead of hanging',
    input: 'effect(() => { s.value = s.value + 1 })',
    run({ signal, effect }, { expect }) {
      const s = signal(0);
      expect(() => effect(() => { s.value = s.value + 1; })).toThrow(/cycle/i);
    },
  },
  {
    group: G3,
    title: 'effects depending on computeds update after nested changes',
    run({ signal, computed, effect, batch }, { expect }) {
      const first = signal('Ada'), last = signal('Lovelace');
      const full = computed(() => `${first.value} ${last.value}`);
      const upper = computed(() => full.value.toUpperCase());
      const seen: string[] = [];
      effect(() => { seen.push(upper.value); });
      batch(() => { first.value = 'Grace'; last.value = 'Hopper'; });
      expect(seen).toEqual(['ADA LOVELACE', 'GRACE HOPPER']);
    },
  },
];
