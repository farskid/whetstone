import type {} from './types';

type Entry = { member: string; score: number };

const cmp = (a: Entry, b: Entry) =>
  a.score < b.score ? -1 : a.score > b.score ? 1 : a.member < b.member ? -1 : a.member > b.member ? 1 : 0;

// A sorted array is enough until the performance test in the last stage.
export class SortedSet {
  private scores = new Map<string, number>();
  private order: Entry[] = [];

  get size(): number { return this.scores.size; }

  /** Number of entries that sort before `key`. */
  private before(key: Entry): number {
    let lo = 0, hi = this.order.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cmp(this.order[mid], key) < 0) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  add(member: string, score: number): boolean {
    if (typeof score !== 'number' || Number.isNaN(score)) throw new RangeError('score must be a number');
    const old = this.scores.get(member);
    if (old === score) return false;
    if (old !== undefined) this.order.splice(this.before({ member, score: old }), 1);
    this.scores.set(member, score);
    this.order.splice(this.before({ member, score }), 0, { member, score });
    return old === undefined;
  }

  score(member: string): number | undefined { return this.scores.get(member); }

  remove(member: string): boolean {
    const score = this.scores.get(member);
    if (score === undefined) return false;
    this.order.splice(this.before({ member, score }), 1);
    this.scores.delete(member);
    return true;
  }

  rank(member: string): number | undefined {
    const score = this.scores.get(member);
    return score === undefined ? undefined : this.before({ member, score });
  }
}
