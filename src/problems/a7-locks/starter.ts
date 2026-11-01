export interface Clock { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(id: unknown): void }
export type Release = () => void;

export class Semaphore {
  constructor(capacity: number, options: { clock?: Clock } = {}) {
    throw new Error('Not implemented');
  }
  get available(): number { throw new Error('Not implemented'); }
  get waiting(): number { throw new Error('Not implemented'); }
  acquire(weight = 1, options: { timeout?: number } = {}): Promise<Release> { throw new Error('Not implemented'); }
  tryAcquire(weight = 1): Release | null { throw new Error('Not implemented'); }
  runExclusive<T>(fn: () => T | Promise<T>, weight = 1): Promise<T> { throw new Error('Not implemented'); }
}

export class Mutex {
  constructor(options: { clock?: Clock } = {}) {
    throw new Error('Not implemented');
  }
  get locked(): boolean { throw new Error('Not implemented'); }
  acquire(options: { timeout?: number } = {}): Promise<Release> { throw new Error('Not implemented'); }
  tryAcquire(): Release | null { throw new Error('Not implemented'); }
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T> { throw new Error('Not implemented'); }
}

export class RWLock {
  readLock(): Promise<Release> { throw new Error('Not implemented'); }
  writeLock(): Promise<Release> { throw new Error('Not implemented'); }
  runRead<T>(fn: () => T | Promise<T>): Promise<T> { throw new Error('Not implemented'); }
  runWrite<T>(fn: () => T | Promise<T>): Promise<T> { throw new Error('Not implemented'); }
}
