import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Piece table edits';
const G2 = 'Lines and positions';
const G3 = 'CRLF and Unicode';
const G4 = 'Snapshots';
const G5 = 'Performance';

function rangeError(fn: () => unknown): boolean {
  try { fn(); } catch (e) { return e instanceof RangeError; }
  return false;
}

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'insert and delete in the middle',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('hello world');
      b.insert(5, ',');
      expect(b.getText()).toBe('hello, world');
      b.delete(0, 7);
      expect([b.getText(), b.length]).toEqual(['world', 5]);
    },
  },
  {
    group: G1,
    title: 'edits at 0 and at the end; empty buffer',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer();
      expect([b.getText(), b.length]).toEqual(['', 0]);
      b.insert(0, 'b'); b.insert(0, 'a'); b.insert(2, 'c');
      expect(b.getText()).toBe('abc');
      b.delete(2, 1); b.delete(0, 1);
      expect(b.getText()).toBe('b');
      b.delete(0, 1);
      expect([b.getText(), b.length]).toEqual(['', 0]);
    },
  },
  {
    group: G1,
    title: 'delete across many pieces; delete past the end stops at the end',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('0123456789');
      b.insert(2, 'AA'); b.insert(6, 'BB'); b.insert(10, 'CC');
      expect(b.getText()).toBe('01AA23BB45CC6789');
      b.delete(1, 12);
      expect(b.getText()).toBe('0789');
      b.delete(2, 1000);
      expect(b.getText()).toBe('07');
    },
  },
  {
    group: G1,
    title: 'out-of-range offsets throw RangeError',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('abc');
      expect(rangeError(() => b.insert(4, 'x')), 'insert past end').toBe(true);
      expect(rangeError(() => b.insert(-1, 'x')), 'negative').toBe(true);
      expect(rangeError(() => b.delete(5, 1)), 'delete past end').toBe(true);
      expect(rangeError(() => b.insert(1.5, 'x')), 'fraction').toBe(true);
      expect(b.getText()).toBe('abc');
    },
  },
  {
    group: G2,
    title: 'an empty buffer has one empty line',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer();
      expect([b.lineCount, b.getLine(0), b.positionAt(0), b.offsetAt({ line: 0, col: 3 })]).toEqual([1, '', { line: 0, col: 0 }, 0]);
      b.insert(0, 'x'); b.delete(0, 1);
      expect([b.lineCount, b.getLine(0)]).toEqual([1, '']);
    },
  },
  {
    group: G2,
    title: 'lineCount and getLine follow edits',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('one\ntwo\nthree');
      expect([b.lineCount, b.getLine(0), b.getLine(2)]).toEqual([3, 'one', 'three']);
      b.insert(3, '\ninserted');
      expect([b.lineCount, b.getLine(1), b.getLine(2)]).toEqual([4, 'inserted', 'two']);
      b.delete(3, 13);
      expect([b.lineCount, b.getLine(0), b.getText()]).toEqual([2, 'one', 'one\nthree']);
      b.insert(b.length, '\n');
      expect([b.lineCount, b.getLine(2)]).toEqual([3, '']);
      expect(rangeError(() => b.getLine(3))).toBe(true);
    },
  },
  {
    group: G2,
    title: 'positionAt and offsetAt round-trip and clamp',
    input: '"ab\\ncde\\n\\nf"',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('ab\ncde\n\nf');
      expect([0, 2, 3, 5, 7, 8, 9].map((o) => b.positionAt(o))).toEqual([
        { line: 0, col: 0 }, { line: 0, col: 2 }, { line: 1, col: 0 }, { line: 1, col: 2 },
        { line: 2, col: 0 }, { line: 3, col: 0 }, { line: 3, col: 1 },
      ]);
      for (let o = 0; o <= b.length; o++) {
        const p = b.positionAt(o);
        expect(b.offsetAt(p) <= o, `offsetAt(positionAt(${o}))`).toBe(true);
      }
      expect(b.offsetAt({ line: 1, col: 2 })).toBe(5);
      expect(b.offsetAt({ line: 0, col: 99 }), 'col clamps to line end').toBe(2);
      expect(b.offsetAt({ line: 99, col: 0 }), 'line clamps').toBe(8);
      expect(b.offsetAt({ line: -3, col: -3 })).toBe(0);
      expect([b.positionAt(-5), b.positionAt(1000)]).toEqual([{ line: 0, col: 0 }, { line: 3, col: 1 }]);
    },
  },
  {
    group: G3,
    title: 'CRLF and LF mixed',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('a\r\nbb\ncc\r\n');
      expect([b.lineCount, b.getLine(0), b.getLine(1), b.getLine(2), b.getLine(3)]).toEqual([4, 'a', 'bb', 'cc', '']);
      expect(b.positionAt(1), 'on the \\r').toEqual({ line: 0, col: 1 });
      expect(b.positionAt(2), 'between \\r and \\n').toEqual({ line: 0, col: 1 });
      expect(b.positionAt(3)).toEqual({ line: 1, col: 0 });
      expect(b.offsetAt({ line: 0, col: 5 }), 'col clamps before \\r\\n').toBe(1);
    },
  },
  {
    group: G3,
    title: '\\r and \\n typed in separate edits are one break',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('xy');
      b.insert(1, 'one\r');
      b.insert(0, '>');           // a separate piece in between keeps the halves apart
      b.insert(6, '\ntwo');
      expect(b.getText()).toBe('>xone\r\ntwoy');
      expect([b.lineCount, b.getLine(0), b.getLine(1)]).toEqual([2, '>xone', 'twoy']);
      expect(b.positionAt(6)).toEqual({ line: 0, col: 5 });
    },
  },
  {
    group: G3,
    title: 'a lone \\r is ordinary text',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('a\rb\nc\r');
      expect([b.lineCount, b.getLine(0), b.getLine(1)]).toEqual([2, 'a\rb', 'c\r']);
    },
  },
  {
    group: G3,
    title: 'surrogate pairs are never split',
    input: '"a😀b" (the emoji is 2 code units)',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('a😀b');
      expect(b.length).toBe(4);
      expect(rangeError(() => b.insert(2, 'x')), 'insert inside the pair').toBe(true);
      expect(rangeError(() => b.delete(0, 2)), 'delete ending inside the pair').toBe(true);
      expect(rangeError(() => b.delete(2, 1)), 'delete starting inside the pair').toBe(true);
      expect(b.getText(), 'unchanged').toBe('a😀b');
      expect(b.offsetAt({ line: 0, col: 2 }), 'col moves back to the pair start').toBe(1);
      b.delete(1, 2);
      expect(b.getText()).toBe('ab');
    },
  },
  {
    group: G4,
    title: 'snapshots are unaffected by later edits',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('hello\nworld');
      const s1 = b.snapshot();
      b.insert(5, ',');
      b.delete(0, 1);
      const s2 = b.snapshot();
      b.insert(0, 'J');
      b.delete(b.length - 5, 5);
      expect([s1.getText(), s1.length]).toEqual(['hello\nworld', 11]);
      expect(s2.getText()).toBe('ello,\nworld');
      expect(b.getText()).toBe('Jello,\n');
    },
  },
  {
    group: G4,
    title: 'perf: snapshot after every edit stays O(1)',
    run({ TextBuffer }, { expect }) {
      const b = new TextBuffer('x'.repeat(2_000_000));
      const t0 = performance.now();
      const snaps: { getText(): string }[] = [];
      let i = 0;
      for (; i < 3000; i++) {
        snaps.push(b.snapshot());
        b.insert((i * 7919) % b.length, 'y');
        if ((i & 127) === 0 && performance.now() - t0 > 1000) break;
      }
      expect(i, 'edits finished in time').toBe(3000);
      expect(snaps[10].getText().split('y').length - 1).toBe(10);
    },
  },
  {
    group: G5,
    title: 'perf: thousands of edits on a 4 MB document',
    run({ TextBuffer }, { expect }) {
      const line = 'const value = compute(input, options);\n';
      const b = new TextBuffer(line.repeat(100_000));
      const t0 = performance.now();
      let i = 0;
      for (; i < 3000; i++) {
        const at = (i * 104729) % b.length;
        const safe = b.offsetAt(b.positionAt(at));
        if (i % 3 === 2) b.delete(safe, 3); else b.insert(safe, i % 2 ? 'x' : '\n');
        if ((i & 63) === 0 && performance.now() - t0 > 1200) break;
      }
      expect(i, 'edits finished in time').toBe(3000);
      const n = b.lineCount;
      expect(typeof b.getLine(n >> 1)).toBe('string');
      expect(performance.now() - t0, 'ms').toBeLessThan(1500);
    },
  },
  {
    group: G5,
    title: '10k random edits match a plain string',
    run({ TextBuffer }, { expect }) {
      let seed = 11;
      const rnd = (n: number) => { seed = (seed * 16807) % 2147483647; return seed % n; };
      const alphabet = ['a', 'b', '\n', '\r', '\r\n', 'xyz', '😀'];
      let model = 'start\r\nhere';
      const b = new TextBuffer(model);
      const ok = (o: number) => !(o > 0 && o < model.length && /[\ud800-\udbff]/.test(model[o - 1]) && /[\udc00-\udfff]/.test(model[o]));
      for (let step = 0; step < 10_000; step++) {
        const at = rnd(model.length + 1);
        if (!ok(at)) continue;
        if (rnd(3) === 0 && model.length) {
          const end = Math.min(model.length, at + rnd(6));
          if (!ok(end)) continue;
          b.delete(at, end - at);
          model = model.slice(0, at) + model.slice(end);
        } else {
          const t = alphabet[rnd(alphabet.length)];
          b.insert(at, t);
          model = model.slice(0, at) + t + model.slice(at);
        }
      }
      expect(b.getText()).toBe(model);
      const lines = model.split('\n').map((l, i, all) => (i < all.length - 1 ? l.replace(/\r$/, '') : l));
      expect(b.lineCount).toBe(lines.length);
      expect(lines.every((l, i) => b.getLine(i) === l), 'every line matches').toBe(true);
    },
  },
];
