import type { TestCase } from '../../runner/types';
import type { Rect, TreeItem } from './solution';
type M = typeof import('./solution');

function thrown(fn: () => unknown): unknown {
  try { fn(); } catch (e) { return e; }
  return undefined;
}

/** Five 40px rows with no gaps: midpoints 20, 60, 100, 140, 180. */
const ROWS: Rect[] = [0, 40, 80, 120, 160].map((top) => ({ top, height: 40 }));

/*
 * a
 *   a1
 *   a2
 *     a2x
 * b
 *   b1
 * c
 */
const TREE: TreeItem[] = [
  { id: 'a', parentId: null },
  { id: 'a1', parentId: 'a' },
  { id: 'a2', parentId: 'a' },
  { id: 'a2x', parentId: 'a2' },
  { id: 'b', parentId: null },
  { id: 'b1', parentId: 'b' },
  { id: 'c', parentId: null },
];
const show = (items: TreeItem[]) => items.map((i) => `${i.id}<${i.parentId ?? '-'}`).join(' ');

export const tests: TestCase<M>[] = [
  {
    group: 'arrayMove',
    title: 'moves forward and backward without mutating',
    run({ arrayMove }, { expect }) {
      const list = ['a', 'b', 'c', 'd', 'e'];
      expect(arrayMove(list, 1, 3)).toEqual(['a', 'c', 'd', 'b', 'e']);
      expect(arrayMove(list, 4, 0)).toEqual(['e', 'a', 'b', 'c', 'd']);
      expect(arrayMove(list, 0, 4)).toEqual(['b', 'c', 'd', 'e', 'a']);
      const same = arrayMove(list, 2, 2);
      expect(same).toEqual(list);
      expect(same === list, 'a new array even for a no-op').toBe(false);
      expect(list).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(thrown(() => arrayMove(list, 5, 0)) instanceof RangeError, 'from past the end').toBe(true);
      expect(thrown(() => arrayMove(list, 0, -1)) instanceof RangeError, 'negative to').toBe(true);
      expect(thrown(() => arrayMove(list, 1.5, 0)) instanceof RangeError, 'fractional').toBe(true);
    },
  },
  {
    group: 'Drop index',
    title: 'midpoint rule against the other rows',
    input: 'dragging row 1 (top 40) in five 40px rows',
    run({ getDropIndex }, { expect }) {
      expect(getDropIndex(ROWS, 1, 19)).toBe(0);
      expect(getDropIndex(ROWS, 1, 20), 'exactly on a midpoint does not pass it').toBe(0);
      expect(getDropIndex(ROWS, 1, 21)).toBe(1);
      expect(getDropIndex(ROWS, 1, 100)).toBe(1);
      expect(getDropIndex(ROWS, 1, 101)).toBe(2);
      expect(getDropIndex(ROWS, 1, 141)).toBe(3);
      expect(getDropIndex(ROWS, 1, 181)).toBe(4);
    },
  },
  {
    group: 'Drop index',
    title: 'own rect is excluded; first, last and same position',
    run({ getDropIndex, arrayMove }, { expect }) {
      for (let active = 0; active < 5; active++) {
        const own = ROWS[active];
        for (const y of [own.top + 1, own.top + 20, own.top + 39]) {
          expect(getDropIndex(ROWS, active, y), `row ${active} hovering itself at ${y}`).toBe(active);
        }
      }
      expect(getDropIndex(ROWS, 3, -500), 'far above').toBe(0);
      expect(getDropIndex(ROWS, 0, 9999), 'far below').toBe(4);
      const list = ['a', 'b', 'c', 'd', 'e'];
      expect(arrayMove(list, 4, getDropIndex(ROWS, 4, 59))).toEqual(['a', 'e', 'b', 'c', 'd']);
      expect(thrown(() => getDropIndex(ROWS, 5, 0)) instanceof RangeError).toBe(true);
    },
  },
  {
    group: 'Drop index',
    title: 'variable heights and gaps',
    input: 'rows: [0,20) [30,130) [140,150) [160,260); midpoints 10, 80, 145, 210',
    run({ getDropIndex }, { expect }) {
      const rects: Rect[] = [{ top: 0, height: 20 }, { top: 30, height: 100 }, { top: 140, height: 10 }, { top: 160, height: 100 }];
      expect(getDropIndex(rects, 0, 79)).toBe(0);
      expect(getDropIndex(rects, 0, 81)).toBe(1);
      expect(getDropIndex(rects, 0, 146)).toBe(2);
      expect(getDropIndex(rects, 3, 11)).toBe(1);
      expect(getDropIndex(rects, 3, 150), 'dragging the tall last row up').toBe(3);
      expect(getDropIndex(rects, 1, 9)).toBe(0);
      expect(getDropIndex(rects, 1, 300)).toBe(3);
    },
  },
  {
    group: 'Multi-select',
    title: 'moveMany keeps the original relative order',
    run({ moveMany }, { expect }) {
      const list = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(moveMany(list, [1, 4], 0)).toEqual(['b', 'e', 'a', 'c', 'd', 'f']);
      expect(moveMany(list, [4, 1], 0), 'selection order does not matter').toEqual(['b', 'e', 'a', 'c', 'd', 'f']);
      expect(moveMany(list, [0, 2, 5], 3), 'to the end of the rest').toEqual(['b', 'd', 'e', 'a', 'c', 'f']);
      expect(moveMany(list, [3, 3, 1], 1), 'duplicates count once').toEqual(['a', 'b', 'd', 'c', 'e', 'f']);
      expect(moveMany(list, [], 2)).toEqual(list);
      expect(list).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
      expect(thrown(() => moveMany(list, [1, 4], 5)) instanceof RangeError, 'only 4 items remain').toBe(true);
      expect(thrown(() => moveMany(list, [6], 0)) instanceof RangeError).toBe(true);
    },
  },
  {
    group: 'Multi-select',
    title: 'getDropIndexMany ignores every selected rect',
    input: 'six 40px rows, rows 1 and 4 selected',
    run({ getDropIndexMany, moveMany }, { expect }) {
      const rects: Rect[] = [0, 40, 80, 120, 160, 200].map((top) => ({ top, height: 40 }));
      expect(getDropIndexMany(rects, [1, 4], 0)).toBe(0);
      expect(getDropIndexMany(rects, [1, 4], 61), 'row 1 is selected, so its midpoint is ignored').toBe(1);
      expect(getDropIndexMany(rects, [1, 4], 101)).toBe(2);
      expect(getDropIndexMany(rects, [1, 4], 181), 'row 4 is selected too').toBe(3);
      expect(getDropIndexMany(rects, [1, 4], 221)).toBe(4);
      const list = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(moveMany(list, [4, 1], getDropIndexMany(rects, [1, 4], 999))).toEqual(['a', 'c', 'd', 'f', 'b', 'e']);
      expect(moveMany(list, [1, 4], getDropIndexMany(rects, [1, 4], 101))).toEqual(['a', 'c', 'b', 'e', 'd', 'f']);
    },
  },
  {
    group: 'Trees',
    title: 'depth follows the horizontal offset',
    input: 'dragging b1 (depth 1); the list without it is a a1 a2 a2x b c',
    run({ getTreeDrop }, { expect }) {
      expect(getTreeDrop(TREE, 'b1', 4, 0), 'gap between a2x and b, no offset').toEqual({ depth: 1, parentId: 'a', index: 2 });
      expect(getTreeDrop(TREE, 'b1', 4, -20)).toEqual({ depth: 0, parentId: null, index: 1 });
      expect(getTreeDrop(TREE, 'b1', 4, 20)).toEqual({ depth: 2, parentId: 'a2', index: 1 });
      expect(getTreeDrop(TREE, 'b1', 4, 29), 'rounds to the nearest level').toEqual({ depth: 2, parentId: 'a2', index: 1 });
      expect(getTreeDrop(TREE, 'b1', 4, 31)).toEqual({ depth: 3, parentId: 'a2x', index: 0 });
      expect(getTreeDrop(TREE, 'b1', 4, 15, { indent: 10 })).toEqual({ depth: 3, parentId: 'a2x', index: 0 });
    },
  },
  {
    group: 'Trees',
    title: 'depth is clamped by the neighbours',
    run({ getTreeDrop }, { expect }) {
      expect(getTreeDrop(TREE, 'b1', 4, 500), 'at most prev.depth + 1').toEqual({ depth: 3, parentId: 'a2x', index: 0 });
      expect(getTreeDrop(TREE, 'b1', 4, -500)).toEqual({ depth: 0, parentId: null, index: 1 });
      expect(getTreeDrop(TREE, 'b1', 3, -500), 'next (a2x) keeps its parent: at least depth 2').toEqual({ depth: 2, parentId: 'a2', index: 0 });
      expect(getTreeDrop(TREE, 'b1', 0, 500), 'first position: root only').toEqual({ depth: 0, parentId: null, index: 0 });
      expect(getTreeDrop(TREE, 'b1', 6, 0), 'last position under c').toEqual({ depth: 1, parentId: 'c', index: 0 });
      expect(getTreeDrop(TREE, 'b1', 6, -20)).toEqual({ depth: 0, parentId: null, index: 3 });
      expect(getTreeDrop(TREE, 'a', 0, 0), 'subtree of a removed: list is b b1 c').toEqual({ depth: 0, parentId: null, index: 0 });
      expect(getTreeDrop(TREE, 'a', 2, 20)).toEqual({ depth: 1, parentId: 'b', index: 1 });
      expect(thrown(() => getTreeDrop(TREE, 'b1', 7, 0)) instanceof RangeError, 'only 6 items remain').toBe(true);
      expect(() => getTreeDrop(TREE, 'zz', 0, 0)).toThrow();
    },
  },
  {
    group: 'Trees',
    title: 'maxDepth counts the dragged subtree',
    input: 'a2 has a child, so its subtree is 1 level deep',
    run({ getTreeDrop }, { expect }) {
      expect(getTreeDrop(TREE, 'a2', 2, 20, { maxDepth: 2 })).toEqual({ depth: 1, parentId: 'a', index: 1 });
      expect(getTreeDrop(TREE, 'a2', 2, 20, { maxDepth: 1 }), 'a2x would sit at depth 2').toEqual({ depth: 0, parentId: null, index: 1 });
      expect(getTreeDrop(TREE, 'a2', 1, 0, { maxDepth: 1 }), 'between a and a1, a1 forces depth 1').toBe(null);
      expect(getTreeDrop(TREE, 'c', 6, 100, { maxDepth: 1 })).toEqual({ depth: 1, parentId: 'b', index: 1 });
      expect(getTreeDrop(TREE, 'a', 3, 0, { maxDepth: 1 }), 'a has grandchildren').toBe(null);
    },
  },
  {
    group: 'Trees',
    title: 'moveNode moves whole subtrees and refuses descendants',
    run({ moveNode, isDescendant }, { expect }) {
      expect(show(moveNode(TREE, 'a2', 'b', 1))).toBe('a<- a1<a b<- b1<b a2<b a2x<a2 c<-');
      expect(show(moveNode(TREE, 'a2', 'b', 0))).toBe('a<- a1<a b<- a2<b a2x<a2 b1<b c<-');
      expect(show(moveNode(TREE, 'b', null, 0))).toBe('b<- b1<b a<- a1<a a2<a a2x<a2 c<-');
      expect(show(moveNode(TREE, 'a', null, 2)), 'to the end of the root level').toBe('b<- b1<b c<- a<- a1<a a2<a a2x<a2');
      expect(show(moveNode(TREE, 'c', 'a2x', 0))).toBe('a<- a1<a a2<a a2x<a2 c<a2x b<- b1<b');
      expect(show(TREE), 'input untouched').toBe('a<- a1<a a2<a a2x<a2 b<- b1<b c<-');
      expect(() => moveNode(TREE, 'a', 'a2x', 0), 'into a grandchild').toThrow();
      expect(() => moveNode(TREE, 'a2', 'a2', 0), 'into itself').toThrow();
      expect(thrown(() => moveNode(TREE, 'a2', 'b', 2)) instanceof RangeError, 'b has one other child').toBe(true);
      expect(isDescendant(TREE, 'a', 'a2x')).toBe(true);
      expect(isDescendant(TREE, 'a2x', 'a')).toBe(false);
      expect(isDescendant(TREE, 'a', 'a')).toBe(false);
    },
  },
  {
    group: 'Trees',
    title: 'every projected drop lands exactly at the insert position',
    run({ getTreeDrop, moveNode }, { expect }) {
      const tree: TreeItem[] = [];
      let seed = 3;
      const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
      const stack: string[] = [];
      for (let i = 0; i < 18; i++) {
        stack.length = rnd(Math.min(stack.length, 3) + 1);
        const id = `n${i}`;
        tree.push({ id, parentId: stack.length ? stack[stack.length - 1] : null });
        stack.push(id);
      }
      let checked = 0;
      for (const active of tree) {
        const start = tree.indexOf(active);
        let end = start + 1;
        const depthOf = (it: TreeItem): number => (it.parentId === null ? 0 : 1 + depthOf(tree.find((t) => t.id === it.parentId)!));
        while (end < tree.length && depthOf(tree[end]) > depthOf(active)) end++;
        const rest = [...tree.slice(0, start), ...tree.slice(end)];
        for (let ins = 0; ins <= rest.length; ins++) {
          const drop = getTreeDrop(tree, active.id, ins, (rnd(9) - 4) * 20, { maxDepth: 4 });
          if (!drop) continue;
          const moved = moveNode(tree, active.id, drop.parentId, drop.index);
          expect(moved.findIndex((t) => t.id === active.id), `${active.id} at ${ins}`).toBe(ins);
          expect(depthOf({ id: '', parentId: drop.parentId }), `${active.id} depth at ${ins}`).toBe(drop.depth);
          checked++;
        }
      }
      expect(checked > 100, 'enough cases').toBe(true);
    },
  },
];
