import type { Release } from './types';

interface Waiter { weight: number; grant(): void }

export class Semaphore {
  private free: number;
  private queue: Waiter[] = [];

  constructor(private capacity: number) {
    if (!(Number.isInteger(capacity) && capacity >= 1)) throw new RangeError('capacity must be a positive integer');
    this.free = capacity;
  }

  get available(): number { return this.free; }
  get waiting(): number { return this.queue.length; }

  private check(weight: number) {
    if (!(Number.isInteger(weight) && weight >= 1 && weight <= this.capacity)) {
      throw new RangeError(`weight must be an integer in 1..${this.capacity}, got ${weight}`);
    }
  }

  private take(weight: number): Release {
    this.free -= weight;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.free += weight;
      this.drain();
    };
  }

  private drain() {
    while (this.queue.length && this.queue[0].weight <= this.free) this.queue.shift()!.grant();
  }

  acquire(weight = 1): Promise<Release> {
    this.check(weight);
    if (!this.queue.length && weight <= this.free) return Promise.resolve(this.take(weight));
    return new Promise((resolve) => this.queue.push({ weight, grant: () => resolve(this.take(weight)) }));
  }

  tryAcquire(weight = 1): Release | null {
    this.check(weight);
    return !this.queue.length && weight <= this.free ? this.take(weight) : null;
  }

  async runExclusive<T>(fn: () => T | Promise<T>, weight = 1): Promise<T> {
    const release = await this.acquire(weight);
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export class Mutex {
  private sem: Semaphore;
  constructor() {
    this.sem = new Semaphore(1);
  }
  get locked(): boolean { return this.sem.available === 0; }
  acquire(): Promise<Release> { return this.sem.acquire(1); }
  tryAcquire(): Release | null { return this.sem.tryAcquire(1); }
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T> { return this.sem.runExclusive(fn, 1); }
}
