import type { Rect } from './types';

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
  return [...rest.slice(0, toIndex), ...moving, ...rest.slice(toIndex)];
}

export function getDropIndexMany(rects: readonly Rect[], selected: readonly number[], pointerY: number): number {
  const sel = selectedSet(selected, rects.length);
  let n = 0;
  rects.forEach((r, i) => {
    if (!sel.has(i) && mid(r) < pointerY) n++;
  });
  return n;
}
