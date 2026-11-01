export type Entry = { member: string; score: number };
export type Bound = number | string;

export class SortedSet {
  get size(): number { throw new Error('Not implemented'); }
  add(member: string, score: number): boolean { throw new Error('Not implemented'); }
  score(member: string): number | undefined { throw new Error('Not implemented'); }
  remove(member: string): boolean { throw new Error('Not implemented'); }
  rank(member: string): number | undefined { throw new Error('Not implemented'); }
  revRank(member: string): number | undefined { throw new Error('Not implemented'); }
  rangeByRank(start: number, stop: number, options?: { rev?: boolean }): Entry[] { throw new Error('Not implemented'); }
  rangeByScore(min: Bound, max: Bound, options?: { offset?: number; count?: number }): Entry[] { throw new Error('Not implemented'); }
  incrBy(member: string, delta: number): number { throw new Error('Not implemented'); }
  denseRevRank(member: string): number | undefined { throw new Error('Not implemented'); }
  around(member: string, k: number): Entry[] { throw new Error('Not implemented'); }
}
