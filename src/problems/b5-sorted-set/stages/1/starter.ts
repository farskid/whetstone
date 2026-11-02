import type {} from './types';

export class SortedSet {
  get size(): number { throw new Error('Not implemented'); }
  add(member: string, score: number): boolean { throw new Error('Not implemented'); }
  score(member: string): number | undefined { throw new Error('Not implemented'); }
  remove(member: string): boolean { throw new Error('Not implemented'); }
  rank(member: string): number | undefined { throw new Error('Not implemented'); }
}
