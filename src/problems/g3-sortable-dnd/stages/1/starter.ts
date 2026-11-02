import type { Rect } from './types';

export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  throw new Error('Not implemented');
}

/** Final index of the dragged item: how many other items have their midpoint above the pointer. */
export function getDropIndex(rects: readonly Rect[], activeIndex: number, pointerY: number): number {
  throw new Error('Not implemented');
}
