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
