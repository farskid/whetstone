import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Snapshot stack';
const G2 = 'Coalescing and capacity';
const G3 = 'Transactions';
const G4 = 'Selection and commands';

const snapshot = (h: { state: unknown; canUndo(): boolean; canRedo(): boolean }) => [h.state, h.canUndo(), h.canRedo()];

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'push, undo and redo walk the stack',
    run({ createHistory }, { expect, clock }) {
      const c = clock();
      const h = createHistory(0, { clock: c });
      expect(snapshot(h)).toEqual([0, false, false]);
      expect(h.undo()).toBe(false);
      h.push(1); h.push(2); h.push(3);
      expect(h.undo()).toBe(true);
      expect(h.undo()).toBe(true);
      expect(snapshot(h)).toEqual([1, true, true]);
      expect(h.redo()).toBe(true);
      expect(snapshot(h)).toEqual([2, true, true]);
      h.redo();
      expect(h.redo()).toBe(false);
      expect(snapshot(h)).toEqual([3, true, false]);
    },
  },
  {
    group: G1,
    title: 'a push after undo clears redo',
    run({ createHistory }, { expect, clock }) {
      const h = createHistory('a', { clock: clock() });
      h.push('b'); h.push('c');
      h.undo(); h.undo();
      h.push('x');
      expect(snapshot(h)).toEqual(['x', true, false]);
      h.undo();
      expect(h.state).toBe('a');
    },
  },
  {
    group: G2,
    title: 'pushes with the same groupKey within the window coalesce',
    run({ createHistory }, { expect, clock }) {
      const c = clock();
      const h = createHistory('', { clock: c });
      for (const s of ['h', 'he', 'hel', 'hell', 'hello']) { h.push(s, { groupKey: 'typing' }); c.tick(400); }
      expect(h.state).toBe('hello');
      h.undo();
      expect(snapshot(h), 'gap is measured from the last push, so 5 × 400 ms is one group').toEqual(['', false, true]);
      h.redo();
      c.tick(1000);
      h.push('hello!', { groupKey: 'typing' });
      h.undo();
      expect(h.state, 'a gap over coalesceMs starts a new step').toBe('hello');
    },
  },
  {
    group: G2,
    title: 'different keys, no key, undo and the exact boundary',
    run({ createHistory }, { expect, clock }) {
      const c = clock();
      const h = createHistory(0, { clock: c, coalesceMs: 100 });
      h.push(1, { groupKey: 'a' });
      c.tick(10); h.push(2, { groupKey: 'b' });
      c.tick(10); h.push(3);
      c.tick(10); h.push(4);
      c.tick(100); h.push(5, { groupKey: 'b' });
      c.tick(100); h.push(6, { groupKey: 'b' });
      const states: unknown[] = [h.state];
      while (h.undo()) states.push(h.state);
      expect(states, 'exactly coalesceMs still coalesces; keyless pushes never do').toEqual([6, 4, 3, 2, 1, 0]);
      h.redo();
      h.push(7, { groupKey: 'a' });
      expect(h.undo() && h.state).toBe(1);
      h.redo();
      h.push(8, { groupKey: 'a' });
      expect(h.undo() && h.state, 'redo breaks coalescing').toBe(7);
    },
  },
  {
    group: G2,
    title: 'capacity drops the oldest steps',
    run({ createHistory }, { expect, clock }) {
      const h = createHistory(0, { capacity: 3, clock: clock() });
      for (let i = 1; i <= 6; i++) h.push(i);
      let undos = 0;
      while (h.undo()) undos++;
      expect([undos, h.state]).toEqual([3, 3]);
      while (h.redo());
      expect(h.state).toBe(6);
    },
  },
  {
    group: G3,
    title: 'commit makes one step; empty commits add none',
    run({ createHistory }, { expect, clock }) {
      const h = createHistory({ n: 0 }, { clock: clock() });
      h.push({ n: 1 });
      h.begin();
      h.push({ n: 2 }, { groupKey: 'k' });
      h.push({ n: 3 }, { groupKey: 'k' });
      expect(h.canUndo(), 'no undo inside a transaction').toBe(false);
      expect(() => h.undo()).toThrow();
      expect(() => h.redo()).toThrow();
      h.commit();
      expect(h.state).toEqual({ n: 3 });
      h.undo();
      expect(h.state).toEqual({ n: 1 });
      h.redo();
      h.begin(); h.commit();
      h.undo();
      expect(h.state, 'the empty transaction added no step').toEqual({ n: 1 });
    },
  },
  {
    group: G3,
    title: 'nested transactions and rollback',
    run({ createHistory }, { expect, clock }) {
      const h = createHistory('a', { clock: clock() });
      h.begin();
      h.push('b');
      h.begin();
      h.push('c');
      h.rollback();
      expect(h.state, 'inner rollback goes back to the inner begin').toBe('b');
      h.begin();
      h.push('d');
      h.commit();
      expect(h.canUndo(), 'inner commit does not create a step').toBe(false);
      h.commit();
      expect(h.state).toBe('d');
      h.undo();
      expect(snapshot(h)).toEqual(['a', false, true]);
      h.begin(); h.push('z'); h.rollback();
      expect(snapshot(h), 'rollback keeps redo').toEqual(['a', false, true]);
      expect(() => h.commit()).toThrow('No transaction');
      expect(() => h.rollback()).toThrow('No transaction');
    },
  },
  {
    group: G3,
    title: 'commit clears redo and breaks coalescing',
    run({ createHistory }, { expect, clock }) {
      const c = clock();
      const h = createHistory(0, { clock: c });
      h.push(1); h.push(2); h.undo();
      h.begin(); h.push(5); h.commit();
      expect(h.canRedo()).toBe(false);
      h.push(6, { groupKey: 't' });
      h.begin(); h.push(7); h.commit();
      h.push(8, { groupKey: 't' });
      const states: unknown[] = [h.state];
      while (h.undo()) states.push(h.state);
      expect(states).toEqual([8, 7, 6, 5, 1, 0]);
    },
  },
  {
    group: G4,
    title: 'selection travels with each step',
    run({ createHistory }, { expect, clock }) {
      const c = clock();
      const h = createHistory<string, [number, number]>('', { clock: c });
      expect(h.selection).toBe(undefined);
      h.push('ab', { selection: [2, 2] });
      h.push('abc', { selection: [3, 3], groupKey: 'g' });
      h.push('ABC');
      expect(h.selection, 'selection carries over when omitted').toEqual([3, 3]);
      h.undo();
      h.undo();
      expect([h.state, h.selection]).toEqual(['ab', [2, 2]]);
      h.undo();
      expect([h.state, h.selection]).toEqual(['', undefined]);
      h.redo();
      expect(h.selection).toEqual([2, 2]);
      h.begin(); h.push('x', { selection: [9, 9] }); h.rollback();
      expect([h.state, h.selection]).toEqual(['ab', [2, 2]]);
    },
  },
  {
    group: G4,
    title: 'command history: execute, undo, redo, capacity',
    run({ createCommandHistory }, { expect }) {
      const list: number[] = [];
      const add = (n: number) => ({ do: () => list.push(n), undo: () => { list.pop(); } });
      const h = createCommandHistory({ capacity: 2 });
      expect(h.undo()).toBe(false);
      h.execute(add(1)); h.execute(add(2)); h.execute(add(3));
      expect(list).toEqual([1, 2, 3]);
      expect([h.undo(), h.undo(), h.undo()]).toEqual([true, true, false]);
      expect(list).toEqual([1]);
      expect(h.redo()).toBe(true);
      expect(list).toEqual([1, 2]);
      h.execute(add(9));
      expect(h.canRedo()).toBe(false);
      expect(list).toEqual([1, 2, 9]);
    },
  },
  {
    group: G4,
    title: 'command history: throwing commands leave the stacks alone',
    run({ createCommandHistory }, { expect }) {
      const h = createCommandHistory();
      expect(() => h.execute({ do: () => { throw new Error('nope'); }, undo: () => {} })).toThrow('nope');
      expect(h.canUndo()).toBe(false);
      let failUndo = true;
      let value = 0;
      h.execute({ do: () => { value++; }, undo: () => { if (failUndo) throw new Error('stuck'); value--; } });
      expect(() => h.undo()).toThrow('stuck');
      expect([h.canUndo(), h.canRedo(), value]).toEqual([true, false, 1]);
      failUndo = false;
      expect(h.undo()).toBe(true);
      expect([h.canUndo(), h.canRedo(), value]).toEqual([false, true, 0]);
    },
  },
];
