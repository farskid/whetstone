export interface Clock { now(): number }

export class RollingWindow {
  constructor(size: number) { throw new Error('Not implemented'); }
  push(x: number): void { throw new Error('Not implemented'); }
  toArray(): number[] { throw new Error('Not implemented'); }
  count(): number { throw new Error('Not implemented'); }
  avg(): number | undefined { throw new Error('Not implemented'); }
  min(): number | undefined { throw new Error('Not implemented'); }
  max(): number | undefined { throw new Error('Not implemented'); }
  percentile(p: number): number | undefined { throw new Error('Not implemented'); }
}

export class TimeWindow {
  constructor(options: { windowMs: number; clock?: Clock }) { throw new Error('Not implemented'); }
  push(x: number): void { throw new Error('Not implemented'); }
  toArray(): number[] { throw new Error('Not implemented'); }
  count(): number { throw new Error('Not implemented'); }
  avg(): number | undefined { throw new Error('Not implemented'); }
  min(): number | undefined { throw new Error('Not implemented'); }
  max(): number | undefined { throw new Error('Not implemented'); }
  percentile(p: number): number | undefined { throw new Error('Not implemented'); }
}

export class HistogramWindow {
  constructor(options: { windowMs: number; sliceMs: number; buckets: number[]; clock?: Clock }) { throw new Error('Not implemented'); }
  push(x: number): void { throw new Error('Not implemented'); }
  count(): number { throw new Error('Not implemented'); }
  percentile(p: number): number | undefined { throw new Error('Not implemented'); }
}
