import type { Clock } from './types';

function checkValue(x: number) {
  if (typeof x !== 'number' || Number.isNaN(x)) throw new RangeError(`Expected a number, got ${String(x)}`);
}

function rankIndex(p: number, n: number): number {
  if (!(p >= 0 && p <= 100)) throw new RangeError(`percentile must be in 0..100, got ${p}`);
  return Math.min(n - 1, Math.max(0, Math.ceil((p / 100) * n) - 1));
}

/** A FIFO of samples with running sum and monotonic deques for min/max. Entries carry a sequence number. */
class SampleQueue {
  private values: number[] = [];
  private times: number[] = [];
  private head = 0;
  private seq = 0;
  private sum = 0;
  private mins: { v: number; s: number }[] = [];
  private minHead = 0;
  private maxs: { v: number; s: number }[] = [];
  private maxHead = 0;

  get length() { return this.values.length - this.head; }
  oldestTime() { return this.times[this.head]; }

  push(x: number, t: number) {
    checkValue(x);
    const s = this.seq++;
    this.values.push(x); this.times.push(t); this.sum += x;
    while (this.mins.length > this.minHead && this.mins[this.mins.length - 1].v > x) this.mins.pop();
    this.mins.push({ v: x, s });
    while (this.maxs.length > this.maxHead && this.maxs[this.maxs.length - 1].v < x) this.maxs.pop();
    this.maxs.push({ v: x, s });
  }

  shift() {
    const s = this.seq - this.length;
    this.sum -= this.values[this.head];
    this.head++;
    if (this.minHead < this.mins.length && this.mins[this.minHead].s === s) this.minHead++;
    if (this.maxHead < this.maxs.length && this.maxs[this.maxHead].s === s) this.maxHead++;
    if (this.head > 1024 && this.head * 2 > this.values.length) {
      this.values = this.values.slice(this.head); this.times = this.times.slice(this.head); this.head = 0;
      this.mins = this.mins.slice(this.minHead); this.minHead = 0;
      this.maxs = this.maxs.slice(this.maxHead); this.maxHead = 0;
    }
  }

  toArray() { return this.values.slice(this.head); }
  avg() { return this.length ? this.sum / this.length : undefined; }
  min() { return this.length ? this.mins[this.minHead].v : undefined; }
  max() { return this.length ? this.maxs[this.maxHead].v : undefined; }
  percentile(p: number) {
    const n = this.length;
    const i = rankIndex(p, Math.max(n, 1));
    if (!n) return undefined;
    return this.toArray().sort((a, b) => a - b)[i];
  }
}

export class RollingWindow {
  private q = new SampleQueue();
  constructor(private size: number) {
    if (!(Number.isInteger(size) && size >= 1)) throw new RangeError('size must be a positive integer');
  }
  push(x: number): void {
    this.q.push(x, 0);
    if (this.q.length > this.size) this.q.shift();
  }
  toArray(): number[] { return this.q.toArray(); }
  count(): number { return this.q.length; }
  avg() { return this.q.avg(); }
  min() { return this.q.min(); }
  max() { return this.q.max(); }
  percentile(p: number) { return this.q.percentile(p); }
}

export class TimeWindow {
  private q = new SampleQueue();
  private windowMs: number;
  private clock: Clock;
  constructor(options: { windowMs: number; clock?: Clock }) {
    this.windowMs = options.windowMs;
    this.clock = options.clock ?? Date;
  }
  private evict() {
    const now = this.clock.now();
    while (this.q.length && now - this.q.oldestTime() >= this.windowMs) this.q.shift();
    return this.q;
  }
  push(x: number): void { checkValue(x); this.evict().push(x, this.clock.now()); }
  toArray(): number[] { return this.evict().toArray(); }
  count(): number { return this.evict().length; }
  avg() { return this.evict().avg(); }
  min() { return this.evict().min(); }
  max() { return this.evict().max(); }
  percentile(p: number) { return this.evict().percentile(p); }
}
