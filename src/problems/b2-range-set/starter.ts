import type { Range, Person } from './types';

export class RangeSet {
  add(range: Range): void { throw new Error('Not implemented'); }
  remove(range: Range): void { throw new Error('Not implemented'); }
  contains(x: number): boolean { throw new Error('Not implemented'); }
  overlaps(range: Range): boolean { throw new Error('Not implemented'); }
  toArray(): Range[] { throw new Error('Not implemented'); }
  freeSlots(window: Range, minDuration = 0): Range[] { throw new Error('Not implemented'); }
}

export function commonFreeSlots(people: Person[], window: Range, minDuration = 0): Range[] {
  throw new Error('Not implemented');
}
