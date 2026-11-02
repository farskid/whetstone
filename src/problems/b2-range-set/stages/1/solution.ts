import type { Range } from './types';

export class RangeSet {
  // Disjoint, non-touching, sorted ranges kept as two parallel arrays.
  private starts: number[] = [];
  private ends: number[] = [];

  /** Index of the first range whose end is >= x (the first range that could touch or contain x). */
  private firstEndAtLeast(x: number): number {
    let lo = 0, hi = this.ends.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ends[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  /** Index of the first range whose start is > x. */
  private firstStartAbove(x: number): number {
    let lo = 0, hi = this.starts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.starts[mid] <= x) lo = mid + 1; else hi = mid;
    }
    return lo;
  }

  add([s, e]: Range): void {
    if (!(e > s)) return;
    const i = this.firstEndAtLeast(s);   // first range touching from the left
    const j = this.firstStartAbove(e);   // ranges i..j-1 touch or overlap [s, e)
    if (i < j) {
      s = Math.min(s, this.starts[i]);
      e = Math.max(e, this.ends[j - 1]);
    }
    this.starts.splice(i, j - i, s);
    this.ends.splice(i, j - i, e);
  }

  toArray(): Range[] {
    return this.starts.map((s, i) => [s, this.ends[i]] as Range);
  }
}
