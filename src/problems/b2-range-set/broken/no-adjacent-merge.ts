// Bug: only merges overlapping ranges, so touching ranges stay apart.
export type Range = [start: number, end: number];

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
    let i = this.firstEndAtLeast(s);
    if (i < this.ends.length && this.ends[i] === s) i++;
    let j = this.firstStartAbove(e);
    if (j > i && this.starts[j - 1] === e) j--;   // ranges i..j-1 touch or overlap [s, e)
    if (i < j) {
      s = Math.min(s, this.starts[i]);
      e = Math.max(e, this.ends[j - 1]);
    }
    this.starts.splice(i, j - i, s);
    this.ends.splice(i, j - i, e);
  }

  remove([s, e]: Range): void {
    if (!(e > s)) return;
    let i = this.firstEndAtLeast(s);
    if (i < this.ends.length && this.ends[i] === s) i++;   // touching on the left is not overlapping
    let j = i;
    while (j < this.starts.length && this.starts[j] < e) j++;
    if (i === j) return;
    const keepS: number[] = [], keepE: number[] = [];
    if (this.starts[i] < s) { keepS.push(this.starts[i]); keepE.push(s); }
    if (this.ends[j - 1] > e) { keepS.push(e); keepE.push(this.ends[j - 1]); }
    this.starts.splice(i, j - i, ...keepS);
    this.ends.splice(i, j - i, ...keepE);
  }

  contains(x: number): boolean {
    const i = this.firstStartAbove(x) - 1;
    return i >= 0 && x < this.ends[i];
  }

  overlaps([s, e]: Range): boolean {
    if (!(e > s)) return false;
    const i = this.firstStartAbove(s) - 1;
    if (i >= 0 && s < this.ends[i]) return true;
    return i + 1 < this.starts.length && this.starts[i + 1] < e;
  }

  toArray(): Range[] {
    return this.starts.map((s, i) => [s, this.ends[i]] as Range);
  }

  freeSlots([ws, we]: Range, minDuration = 0): Range[] {
    const out: Range[] = [];
    let cursor = ws;
    let i = Math.max(0, this.firstStartAbove(ws) - 1);
    for (; i < this.starts.length && this.starts[i] < we; i++) {
      if (this.ends[i] <= cursor) continue;
      if (this.starts[i] > cursor) out.push([cursor, this.starts[i]]);
      cursor = Math.max(cursor, this.ends[i]);
    }
    if (cursor < we) out.push([cursor, we]);
    return out.filter(([a, b]) => b - a >= minDuration && b > a);
  }
}

export interface Person { busy: Range[]; workingHours: Range[] }

export function commonFreeSlots(people: Person[], window: Range, minDuration = 0): Range[] {
  const blocked = new RangeSet();
  for (const p of people) {
    const working = new RangeSet();
    for (const r of p.workingHours) working.add(r);
    for (const r of working.freeSlots(window)) blocked.add(r);   // outside working hours
    for (const r of p.busy) blocked.add(r);
  }
  return blocked.freeSlots(window, minDuration);
}
