import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Formulas';
const G2 = 'Functions and errors';
const G3 = 'Recalculation and custom functions';
const G4 = 'Cycles';

const E = (code: string) => ({ error: code });

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'inputs: numbers, numeric strings, text, clearing',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 2.5);
      s.set('a2', ' -3 ');
      s.set('A3', 'hello');
      s.set('A4', '1e3');
      expect([s.get('A1'), s.get('A2'), s.get('a3'), s.get('A4'), s.get('Z99')]).toEqual([2.5, -3, 'hello', '1e3', null]);
      s.set('A1', '  ');
      expect(s.get('A1')).toBe(null);
      expect(() => s.set('1A', 1)).toThrow('Invalid address: 1A');
      expect(() => s.get('A0')).toThrow('Invalid address');
    },
  },
  {
    group: G1,
    title: 'precedence, unary minus and references',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 4);
      s.set('B2', '=1+2*3-8/4');
      s.set('B3', '=(1+2)*3');
      s.set('B4', '=-a1--2 + +1');
      s.set('B5', '=10-4-3');
      s.set('B6', '=A1*Z9+1');
      expect([s.get('B2'), s.get('B3'), s.get('B4'), s.get('B5'), s.get('B6')]).toEqual([5, 9, -1, 3, 1]);
    },
  },
  {
    group: G1,
    title: 'text, booleans, & and comparisons',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 'x');
      s.set('B1', '="say ""hi"" "&1+1&TRUE&Z1');
      s.set('B2', '="B">"a"');
      s.set('B3', '=1<"a"');
      s.set('B4', '="abc"="ABC"');
      s.set('B5', '=Z1=0');
      s.set('B6', '=TRUE+TRUE');
      s.set('B7', '=1+2=3');
      s.set('B8', '=A1+1');
      expect([s.get('B1'), s.get('B2'), s.get('B3'), s.get('B4'), s.get('B5'), s.get('B6'), s.get('B7')]).toEqual(['say "hi" 2TRUE', true, true, true, true, 2, true]);
      expect(s.get('B8')).toEqual(E('#VALUE!'));
    },
  },
  {
    group: G2,
    title: 'aggregate functions over ranges',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 1);
      s.set('A2', 'two');
      s.set('A3', 3);
      s.set('B1', '=TRUE');
      s.set('C1', '=SUM(A1:B3)');
      s.set('C2', '=sum(B3:A1, 10, TRUE)');
      s.set('C3', '=AVERAGE(A1:A3)');
      s.set('C4', '=MIN(A1:A3)&","&MAX(A1:A3)&","&MAX(Z1:Z5)');
      s.set('C5', '=COUNT(A1:B3, "x", 5, 1/0)');
      s.set('C6', '=AVERAGE(Z1:Z2)');
      s.set('C7', '=SUM(A2)');
      s.set('C8', '=SUM("two")');
      expect([s.get('C1'), s.get('C2'), s.get('C3'), s.get('C4'), s.get('C5'), s.get('C7')]).toEqual([4, 15, 2, '1,3,0', 3, 0]);
      expect(s.get('C6')).toEqual(E('#DIV/0!'));
      expect(s.get('C8')).toEqual(E('#VALUE!'));
    },
  },
  {
    group: G2,
    title: 'IF evaluates only the chosen branch; CONCAT',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 5);
      s.set('B1', '=IF(A1>3, "big", 1/0)');
      s.set('B2', '=IF(A1-5, 1/0, "zero")');
      s.set('B3', '=IF(Z1, 1)');
      s.set('B4', '=IF("yes", 1, 2)');
      s.set('B5', '=IF(1)');
      s.set('B6', '=CONCAT("a", A1:A2, TRUE, 1.5)');
      expect([s.get('B1'), s.get('B2'), s.get('B3'), s.get('B6')]).toEqual(['big', 'zero', false, 'a5TRUE1.5']);
      expect([s.get('B4'), s.get('B5')]).toEqual([E('#VALUE!'), E('#VALUE!')]);
    },
  },
  {
    group: G2,
    title: 'error codes and propagation',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', '=1/0');
      s.set('A2', '=A1+1');
      s.set('A3', '="x"*NOPE');
      s.set('A4', '=NOPE+1/0');
      s.set('A5', '=nosuch(1)');
      s.set('A6', '=A1:A2');
      s.set('A7', '=SUM(A1:A2)');
      s.set('A8', '=COUNT(A1:A2)');
      expect([s.get('A1'), s.get('A2'), s.get('A3'), s.get('A4'), s.get('A5'), s.get('A6'), s.get('A7'), s.get('A8')])
        .toEqual([E('#DIV/0!'), E('#DIV/0!'), E('#NAME?'), E('#NAME?'), E('#NAME?'), E('#VALUE!'), E('#DIV/0!'), 0]);
      for (const bad of ['=1+', '=(1', '=1 2', '=SUM(1,)', '="open', '=A0+1', '=A1:', '=1)', '=']) {
        s.set('B1', bad);
        expect(s.get('B1'), bad).toEqual(E('#ERROR!'));
      }
    },
  },
  {
    group: G3,
    title: 'dependents update and set returns changed cells in row-major order',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      expect(s.set('A1', 2)).toEqual(['A1']);
      s.set('a2', '3');
      expect(s.set('A3', '=A1*A2+1')).toEqual(['A3']);
      expect(s.set('B1', '=SUM(A1:A3)')).toEqual(['B1']);
      expect(s.set('A1', 4)).toEqual(['A1', 'B1', 'A3']);
      expect(s.get('B1')).toBe(20);
      expect(s.set('A1', '4'), 'same value: nothing changed').toEqual([]);
      s.set('C1', '=A2>0');
      expect(s.set('A2', 5)).toEqual(['B1', 'A2', 'A3']);
      expect(s.set('D1', '=Q1')).toEqual([]);
      expect(s.set('Q1', 'x')).toEqual(['D1', 'Q1']);
    },
  },
  {
    group: G3,
    title: 'each formula evaluates once per set, never with stale inputs',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      const seen: number[] = [];
      s.define('SPY', (x) => { seen.push(x as number); return x as number; });
      s.set('A1', 1);
      s.set('B1', '=A1+1');
      s.set('C1', '=A1*10');
      s.set('D1', '=B1+C1');
      s.set('E1', '=SPY(D1+B1)');
      s.set('F1', '=SPY(99)');
      seen.length = 0;
      s.set('A1', 2);
      expect(seen).toEqual([26]);
      expect(s.get('E1')).toBe(26);
      seen.length = 0;
      s.set('Z1', 1);
      expect(seen, 'unrelated cells are not recalculated').toEqual([]);
      s.set('G1', '=SPY(A1)');
      s.set('G1', '=SPY(7)');
      seen.length = 0;
      s.set('A1', 3);
      expect(seen, 'G1 no longer depends on A1').toEqual([38]);
    },
  },
  {
    group: G4,
    title: 'cycles become #CYCLE! and recover when broken',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', '=A1+1');
      expect(s.get('A1')).toEqual(E('#CYCLE!'));
      s.set('B1', '=B2');
      expect(s.set('B2', '=B3+1')).toEqual(['B1', 'B2']);
      expect(s.set('B3', '=B1')).toEqual(['B1', 'B2', 'B3']);
      s.set('C1', '=B2*2');
      s.set('C2', '=IF(TRUE, 1, B1)');
      expect([s.get('B1'), s.get('B3'), s.get('C1'), s.get('C2')]).toEqual([E('#CYCLE!'), E('#CYCLE!'), E('#CYCLE!'), E('#CYCLE!')]);
      expect(s.set('B3', 5)).toEqual(['B1', 'C1', 'B2', 'C2', 'B3']);
      expect([s.get('B1'), s.get('B2'), s.get('C1'), s.get('C2')]).toEqual([6, 6, 12, 1]);
      s.set('A1', 7);
      expect(s.get('A1')).toBe(7);
    },
  },
  {
    group: G3,
    title: 'custom functions: args, ranges, errors, late definition',
    run({ createSheet }, { expect }) {
      const s = createSheet();
      s.set('A1', 1);
      s.set('A2', 2);
      s.set('B1', '=JOIN("-", A1:A2, A1)');
      expect(s.get('B1')).toEqual(E('#NAME?'));
      s.define('join', (sep, list, x) => (list as unknown[]).join(sep as string) + '|' + String(x));
      expect(s.get('B1'), 'define recalculates').toBe('1-2|1');
      let called = false;
      s.define('BOOM', () => { called = true; throw new Error('nope'); });
      s.define('INF', () => 1 / 0);
      s.set('B2', '=BOOM()');
      s.set('B3', '=INF()+1');
      s.set('A3', '=1/0');
      called = false;
      s.set('B4', '=BOOM(A1:A3)');
      expect([s.get('B2'), s.get('B3'), s.get('B4')]).toEqual([E('#VALUE!'), E('#VALUE!'), E('#DIV/0!')]);
      expect(called, 'not called when an argument is an error').toBe(false);
      expect(s.set('A2', 5)).toEqual(['B1', 'A2']);
      expect(s.get('B1')).toBe('1-5|1');
    },
  },
];
