import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'Line diff';
const G2 = 'Unified patch';
const G3 = 'Apply';
const G4 = 'Words and scale';

const lines = (n: number, f = (i: number) => `line ${i}`) => Array.from({ length: n }, (_, i) => f(i) + '\n').join('');
const edits = (changes: { value: string; added?: boolean; removed?: boolean }[]) =>
  changes.filter((c) => c.added || c.removed).reduce((n, c: any) => n + c.count, 0);

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'a changed line: equal, removed, added, equal',
    run({ diffLines }, { expect }) {
      expect(diffLines('a\nb\nc\n', 'a\nx\nc\n')).toEqual([
        { value: 'a\n', count: 1 },
        { value: 'b\n', count: 1, removed: true },
        { value: 'x\n', count: 1, added: true },
        { value: 'c\n', count: 1 },
      ]);
      expect(diffLines('same\n', 'same\n')).toEqual([{ value: 'same\n', count: 1 }]);
      expect(diffLines('', 'new\nlines\n')).toEqual([{ value: 'new\nlines\n', count: 2, added: true }]);
    },
  },
  {
    group: G1,
    title: 'runs merge and removals come before additions',
    run({ diffLines }, { expect }) {
      const out = diffLines('keep\nold1\nold2\nkeep2\n', 'keep\nnew1\nnew2\nnew3\nkeep2\n');
      expect(out.map((c) => [c.count, c.removed ? '-' : c.added ? '+' : '='])).toEqual([[1, '='], [2, '-'], [3, '+'], [1, '=']]);
      expect(out[1].value + '|' + out[2].value).toBe('old1\nold2\n|new1\nnew2\nnew3\n');
    },
  },
  {
    group: G1,
    title: 'lines keep their terminator; a missing final newline is a change',
    run({ diffLines }, { expect }) {
      expect(diffLines('a\nb', 'a\nb\n')).toEqual([
        { value: 'a\n', count: 1 },
        { value: 'b', count: 1, removed: true },
        { value: 'b\n', count: 1, added: true },
      ]);
    },
  },
  {
    group: G1,
    title: 'diffs are minimal and rebuild both sides',
    run({ diffLines }, { expect }) {
      const a = 'a\nb\nc\na\nb\nb\na\n';
      const b = 'c\nb\na\nb\na\nc\n';
      const out = diffLines(a, b);
      expect(out.filter((c) => !c.added).map((c) => c.value).join('')).toBe(a);
      expect(out.filter((c) => !c.removed).map((c) => c.value).join('')).toBe(b);
      expect(edits(out), 'classic Myers example has D = 5').toBe(5);
      expect(out.every((c) => c.added === undefined || c.added === true) && out.every((c) => !(c.added && c.removed))).toBe(true);
    },
  },
  {
    group: G2,
    title: 'createPatch: headers, context of 3 and separate hunks',
    run({ createPatch }, { expect }) {
      const old = lines(30);
      const next = old.replace('line 2\n', 'LINE 2\n').replace('line 20\n', '').replace('line 29\n', 'line 29\nend\n');
      expect(createPatch('f.txt', old, next)).toBe([
        '--- f.txt', '+++ f.txt',
        '@@ -1,6 +1,6 @@', ' line 0', ' line 1', '-line 2', '+LINE 2', ' line 3', ' line 4', ' line 5',
        '@@ -18,7 +18,6 @@', ' line 17', ' line 18', ' line 19', '-line 20', ' line 21', ' line 22', ' line 23',
        '@@ -28,3 +27,4 @@', ' line 27', ' line 28', ' line 29', '+end', '',
      ].join('\n'));
      expect(createPatch('f', old, old)).toBe('');
      expect(createPatch('f', '', 'x\n')).toBe('--- f\n+++ f\n@@ -0,0 +1,1 @@\n+x\n');
    },
  },
  {
    group: G2,
    title: 'changes up to 2*context apart share a hunk; context option',
    run({ structuredPatch }, { expect }) {
      const old = lines(20);
      const close = old.replace('line 5\n', 'X\n').replace('line 12\n', 'Y\n');
      expect(structuredPatch('a', 'b', old, close).hunks.length, '6 unchanged lines between').toBe(1);
      const far = old.replace('line 5\n', 'X\n').replace('line 13\n', 'Y\n');
      expect(structuredPatch('a', 'b', old, far).hunks.length, '7 unchanged lines between').toBe(2);
      const p = structuredPatch('a', 'b', old, far, { context: 1 });
      expect(p.hunks.map((h) => [h.oldStart, h.oldLines, h.newStart, h.newLines])).toEqual([[5, 3, 5, 3], [13, 3, 13, 3]]);
      expect([p.oldFileName, p.newFileName]).toEqual(['a', 'b']);
    },
  },
  {
    group: G2,
    title: 'empty ranges start at the line before; no-newline markers',
    run({ structuredPatch, createPatch }, { expect }) {
      const h = (o: string, n: string) => structuredPatch('f', 'f', o, n).hunks.map((x) => [x.oldStart, x.oldLines, x.newStart, x.newLines]);
      expect(h('', 'x\n')).toEqual([[0, 0, 1, 1]]);
      expect(h('a\n', '')).toEqual([[1, 1, 0, 0]]);
      expect(h('a\nb\nc\nd\ne\n', 'a\nb\nc\nd\ne\nf\n')).toEqual([[3, 3, 3, 4]]);
      expect(structuredPatch('f', 'f', 'a\nb\nc\nd\ne\n', 'a\nb\nc\nd\ne\nf\n', { context: 0 }).hunks.map((x) => [x.oldStart, x.oldLines, x.newStart, x.newLines])).toEqual([[5, 0, 6, 1]]);
      expect(createPatch('f', 'a\nb', 'a\nc')).toBe('--- f\n+++ f\n@@ -1,2 +1,2 @@\n a\n-b\n\\ No newline at end of file\n+c\n\\ No newline at end of file\n');
      expect(structuredPatch('f', 'f', 'x', 'x\n').hunks[0].lines).toEqual(['-x', '\\ No newline at end of file', '+x']);
    },
  },
  {
    group: G3,
    title: 'applyPatch round-trips text and structured patches',
    run({ applyPatch, createPatch, structuredPatch }, { expect }) {
      const pairs: [string, string][] = [
        [lines(30), lines(30).replace('line 2\n', 'LINE 2\n').replace('line 20\n', '') + 'tail'],
        ['', 'from\nnothing'],
        ['a\nb', 'a\nb\n'],
        ['x\ny\nz\n', ''],
        ['\n\n\n', '\n \n\n'],
      ];
      for (const [o, n] of pairs) {
        expect(applyPatch(o, createPatch('f', o, n)), JSON.stringify([o.slice(0, 20), n.slice(0, 20)])).toBe(n);
        expect(applyPatch(o, structuredPatch('f', 'f', o, n))).toBe(n);
      }
    },
  },
  {
    group: G3,
    title: 'hunks apply at an offset when the file has shifted',
    run({ applyPatch, createPatch }, { expect }) {
      const old = lines(40);
      const next = old.replace('line 10\n', 'TEN\n').replace('line 30\n', 'THIRTY\n');
      const patch = createPatch('f', old, next);
      const shifted = 'new header\nmore\n' + old.replace('line 25\n', '');
      expect(applyPatch(shifted, patch)).toBe('new header\nmore\n' + next.replace('line 25\n', ''));
      const up = old.replace('line 0\nline 1\nline 2\n', '');
      expect(applyPatch(up, patch)).toBe(next.replace('line 0\nline 1\nline 2\n', ''));
      const twoHunks = '--- f\n+++ f\n@@ -1,1 +1,4 @@\n h\n+n1\n+n2\n+n3\n@@ -5,1 +8,1 @@\n-x\n+y\n';
      expect(applyPatch('h\nx\nq\nq\nx\n', twoHunks), 'later hunks shift by what earlier hunks added').toBe('h\nn1\nn2\nn3\nx\nq\nq\ny\n');
      expect(applyPatch('z\nh\nq\nx\nq\nx\n', twoHunks), '…and by how far earlier hunks moved').toBe('z\nh\nn1\nn2\nn3\nq\nx\nq\ny\n');
    },
  },
  {
    group: G3,
    title: 'the nearest match wins, earlier first; conflicts throw',
    run({ applyPatch }, { expect }) {
      const patch = '--- f\n+++ f\n@@ -3,1 +3,1 @@\n-x\n+y\n';
      expect(applyPatch('x\nq\nq\nq\nx\n', patch), 'distance 2 before vs 2 after').toBe('y\nq\nq\nq\nx\n');
      expect(applyPatch('q\nq\nq\nx\n', patch)).toBe('q\nq\nq\ny\n');
      expect(() => applyPatch('a\nb\nc\n', patch)).toThrow();
      expect(() => applyPatch('x', patch), 'terminator must match').toThrow();
      expect(applyPatch('x\n', patch), 'far from the stated line').toBe('y\n');
    },
  },
  {
    group: G4,
    title: 'diffWords works on words and whitespace runs',
    run({ diffWords }, { expect }) {
      expect(diffWords('the quick  fox', 'the slow  fox')).toEqual([
        { value: 'the ', count: 2 },
        { value: 'quick', count: 1, removed: true },
        { value: 'slow', count: 1, added: true },
        { value: '  fox', count: 2 },
      ]);
      expect(diffWords('a b', 'a b c')).toEqual([{ value: 'a b', count: 3 }, { value: ' c', count: 2, added: true }]);
    },
  },
  {
    group: G4,
    title: '10,000 lines with 40 edits diff and patch within 1.5s',
    run({ diffLines, createPatch, applyPatch }, { expect }) {
      const old = lines(10_000);
      const next = lines(10_000, (i) => (i % 250 === 17 ? `edited ${i}` : `line ${i}`));
      const t0 = Date.now();
      const changes = diffLines(old, next);
      const patch = createPatch('big', old, next);
      const applied = applyPatch(old, patch);
      const elapsed = Date.now() - t0;
      expect([edits(changes), applied === next]).toEqual([80, true]);
      expect(elapsed < 1500, `took ${elapsed}ms`).toBe(true);
    },
  },
];
