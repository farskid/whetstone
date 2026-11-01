// Bug: new readers ignore a waiting writer, so a stream of readers starves it.
export interface Clock { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(id: unknown): void }
export type Release = () => void;

const globalClock: Clock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as any),
};

interface Waiter { weight: number; grant(): void }

export class Semaphore {
  private free: number;
  private queue: Waiter[] = [];
  private clock: Clock;

  constructor(private capacity: number, options: { clock?: Clock } = {}) {
    if (!(Number.isInteger(capacity) && capacity >= 1)) throw new RangeError('capacity must be a positive integer');
    this.free = capacity;
    this.clock = options.clock ?? globalClock;
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

  acquire(weight = 1, options: { timeout?: number } = {}): Promise<Release> {
    this.check(weight);
    if (!this.queue.length && weight <= this.free) return Promise.resolve(this.take(weight));
    return new Promise((resolve, reject) => {
      let timer: unknown;
      const waiter: Waiter = {
        weight,
        grant: () => {
          if (timer !== undefined) this.clock.clearTimeout(timer);
          resolve(this.take(weight));
        },
      };
      this.queue.push(waiter);
      if (options.timeout !== undefined) {
        timer = this.clock.setTimeout(() => {
          const i = this.queue.indexOf(waiter);
          if (i < 0) return;
          this.queue.splice(i, 1);
          reject(new Error('Acquire timed out'));
          this.drain();
        }, options.timeout);
      }
    });
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
  constructor(options: { clock?: Clock } = {}) {
    this.sem = new Semaphore(1, options);
  }
  get locked(): boolean { return this.sem.available === 0; }
  acquire(options: { timeout?: number } = {}): Promise<Release> { return this.sem.acquire(1, options); }
  tryAcquire(): Release | null { return this.sem.tryAcquire(1); }
  runExclusive<T>(fn: () => T | Promise<T>): Promise<T> { return this.sem.runExclusive(fn, 1); }
}

interface RWWaiter { write: boolean; grant(): void }

export class RWLock {
  private readers = 0;
  private writer = false;
  private queue: RWWaiter[] = [];

  private release(write: boolean): Release {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      if (write) this.writer = false; else this.readers--;
      this.drain();
    };
  }

  private drain() {
    while (this.queue.length && !this.writer) {
      const next = this.queue[0];
      if (next.write) {
        if (this.readers > 0) return;
        this.queue.shift();
        this.writer = true;
        next.grant();
        return;
      }
      this.queue.shift();
      this.readers++;
      next.grant();
    }
  }

  readLock(): Promise<Release> {
    if (!this.writer) {
      this.readers++;
      return Promise.resolve(this.release(false));
    }
    return new Promise((resolve) => this.queue.push({ write: false, grant: () => resolve(this.release(false)) }));
  }

  writeLock(): Promise<Release> {
    if (!this.writer && this.readers === 0 && !this.queue.length) {
      this.writer = true;
      return Promise.resolve(this.release(true));
    }
    return new Promise((resolve) => this.queue.push({ write: true, grant: () => resolve(this.release(true)) }));
  }

  async runRead<T>(fn: () => T | Promise<T>): Promise<T> {
    const release = await this.readLock();
    try { return await fn(); } finally { release(); }
  }

  async runWrite<T>(fn: () => T | Promise<T>): Promise<T> {
    const release = await this.writeLock();
    try { return await fn(); } finally { release(); }
  }
}
