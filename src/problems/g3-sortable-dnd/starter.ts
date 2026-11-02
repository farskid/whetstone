import type { Rect, TreeItem, TreeDrop, TreeDropOptions } from './types';

export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  throw new Error('Not implemented');
}

/** Final index of the dragged item: how many other items have their midpoint above the pointer. */
export function getDropIndex(rects: readonly Rect[], activeIndex: number, pointerY: number): number {
  throw new Error('Not implemented');
}

/** Moves the selected items, as one block in their original relative order, to `toIndex` of the remaining list. */
export function moveMany<T>(list: readonly T[], selected: readonly number[], toIndex: number): T[] {
  throw new Error('Not implemented');
}

export function getDropIndexMany(rects: readonly Rect[], selected: readonly number[], pointerY: number): number {
  throw new Error('Not implemented');
}

export function isDescendant(items: readonly TreeItem[], ancestorId: string, id: string): boolean {
  throw new Error('Not implemented');
}

export function getTreeDrop(
  items: readonly TreeItem[],
  activeId: string,
  insertIndex: number,
  offsetX: number,
  options: TreeDropOptions = {},
): TreeDrop | null {
  throw new Error('Not implemented');
}

/** Moves a node (with its subtree) to be child number `index` of `parentId`. Returns a new preorder list. */
export function moveNode(items: readonly TreeItem[], id: string, parentId: string | null, index: number): TreeItem[] {
  throw new Error('Not implemented');
}
