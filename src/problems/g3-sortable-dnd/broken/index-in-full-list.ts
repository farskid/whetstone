// Bug: moveMany inserts at toIndex of the full list
export interface Rect {
  top: number;
  height: number;
}

export interface TreeItem {
  id: string;
  parentId: string | null;
}

export interface TreeDrop {
  depth: number;
  parentId: string | null;
  /** Position among the new parent's children. */
  index: number;
}

export interface TreeDropOptions {
  indent?: number;
  maxDepth?: number;
}

function checkIndex(i: number, length: number, what: string): void {
  if (!Number.isInteger(i) || i < 0 || i >= length) throw new RangeError(`${what} ${i} is out of range 0..${length - 1}`);
}

export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  checkIndex(from, list.length, 'from');
  checkIndex(to, list.length, 'to');
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

const mid = (r: Rect) => r.top + r.height / 2;

/** Final index of the dragged item: how many other items have their midpoint above the pointer. */
export function getDropIndex(rects: readonly Rect[], activeIndex: number, pointerY: number): number {
  checkIndex(activeIndex, rects.length, 'activeIndex');
  let n = 0;
  rects.forEach((r, i) => {
    if (i !== activeIndex && mid(r) < pointerY) n++;
  });
  return n;
}

function selectedSet(selected: readonly number[], length: number): Set<number> {
  for (const i of selected) checkIndex(i, length, 'selected index');
  return new Set(selected);
}

/** Moves the selected items, as one block in their original relative order, to `toIndex` of the remaining list. */
export function moveMany<T>(list: readonly T[], selected: readonly number[], toIndex: number): T[] {
  const sel = selectedSet(selected, list.length);
  const moving = list.filter((_, i) => sel.has(i));
  const rest = list.filter((_, i) => !sel.has(i));
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex > rest.length) throw new RangeError(`toIndex ${toIndex} is out of range 0..${rest.length}`);
  const before = list.slice(0, toIndex).filter((_, i) => !sel.has(i)).length;
  return [...rest.slice(0, before), ...moving, ...rest.slice(before)];
}

export function getDropIndexMany(rects: readonly Rect[], selected: readonly number[], pointerY: number): number {
  const sel = selectedSet(selected, rects.length);
  let n = 0;
  rects.forEach((r, i) => {
    if (!sel.has(i) && mid(r) < pointerY) n++;
  });
  return n;
}

interface Flat extends TreeItem {
  depth: number;
}

function withDepths(items: readonly TreeItem[]): Flat[] {
  const depth = new Map<string, number>();
  return items.map((it) => {
    let d = 0;
    if (it.parentId !== null) {
      const p = depth.get(it.parentId);
      if (p === undefined) throw new Error(`Item ${it.id} appears before its parent ${it.parentId}`);
      d = p + 1;
    }
    depth.set(it.id, d);
    return { ...it, depth: d };
  });
}

/** Index range [start, end) of a node and its descendants in a preorder list. */
function subtreeRange(flat: readonly Flat[], id: string): [number, number] {
  const start = flat.findIndex((f) => f.id === id);
  if (start < 0) throw new Error(`Unknown id ${id}`);
  let end = start + 1;
  while (end < flat.length && flat[end].depth > flat[start].depth) end++;
  return [start, end];
}

export function isDescendant(items: readonly TreeItem[], ancestorId: string, id: string): boolean {
  const parent = new Map(items.map((i) => [i.id, i.parentId]));
  let cur = parent.get(id) ?? null;
  while (cur !== null) {
    if (cur === ancestorId) return true;
    cur = parent.get(cur) ?? null;
  }
  return false;
}

/**
 * Where the active subtree lands if inserted before position `insertIndex` of the list with the
 * active subtree removed, given the horizontal drag offset. Returns null when no depth is allowed.
 */
export function getTreeDrop(
  items: readonly TreeItem[],
  activeId: string,
  insertIndex: number,
  offsetX: number,
  options: TreeDropOptions = {},
): TreeDrop | null {
  const { indent = 20, maxDepth = Infinity } = options;
  const flat = withDepths(items);
  const [start, end] = subtreeRange(flat, activeId);
  const active = flat[start];
  let height = 0;
  for (let i = start; i < end; i++) height = Math.max(height, flat[i].depth - active.depth);
  const rest = [...flat.slice(0, start), ...flat.slice(end)];
  if (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > rest.length) {
    throw new RangeError(`insertIndex ${insertIndex} is out of range 0..${rest.length}`);
  }
  const prev = rest[insertIndex - 1];
  const next = rest[insertIndex];
  const lo = next ? next.depth : 0;
  const hi = Math.min(prev ? prev.depth + 1 : 0, maxDepth - height);
  if (hi < lo) return null;
  const projected = active.depth + Math.round(offsetX / indent);
  const depth = Math.min(hi, Math.max(lo, projected));
  let parentId: string | null = null;
  if (depth > 0) {
    for (let i = insertIndex - 1; i >= 0; i--) {
      if (rest[i].depth === depth - 1) {
        parentId = rest[i].id;
        break;
      }
    }
  }
  let index = 0;
  for (let i = 0; i < insertIndex; i++) if (rest[i].parentId === parentId && rest[i].depth === depth) index++;
  return { depth, parentId, index };
}

/** Moves a node (with its subtree) to be child number `index` of `parentId`. Returns a new preorder list. */
export function moveNode(items: readonly TreeItem[], id: string, parentId: string | null, index: number): TreeItem[] {
  const flat = withDepths(items);
  const [start, end] = subtreeRange(flat, id);
  if (parentId !== null) {
    if (parentId === id || isDescendant(items, id, parentId)) throw new Error(`Cannot move ${id} into itself or its own descendant ${parentId}`);
    if (!flat.some((f) => f.id === parentId)) throw new Error(`Unknown parent ${parentId}`);
  }
  const moving = items.slice(start, end).map((it, i) => (i === 0 ? { ...it, parentId } : it));
  const rest = items.filter((_, i) => i < start || i >= end);
  const restFlat = [...flat.slice(0, start), ...flat.slice(end)];
  const children = restFlat.map((f, i) => [f, i] as const).filter(([f]) => f.parentId === parentId);
  if (!Number.isInteger(index) || index < 0 || index > children.length) throw new RangeError(`index ${index} is out of range 0..${children.length}`);
  let at: number;
  if (index < children.length) at = children[index][1];
  else if (parentId === null) at = rest.length;
  else {
    const p = restFlat.findIndex((f) => f.id === parentId);
    at = p + 1;
    while (at < restFlat.length && restFlat[at].depth > restFlat[p].depth) at++;
  }
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)];
}
