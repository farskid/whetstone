// Bug: eviction waits one ms too long
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface BucketOptions {
  capacity: number;
  refillPerSec: number;
  /** Starting tokens (default: capacity). */
  tokens?: number;
  clock?: Clock;
}

export interface KeyedLimiterOptions extends BucketOptions {
  /** Drop a key's bucket after this many ms without a call (default: the time a bucket takes to refill completely). */
  idleMs?: number;
}

export interface KeyedLimiter {
  tryRemove(key: string, n?: number): boolean;
  /** Tokens the key has now (capacity for a key with no bucket). */
  tokens(key: string): number;
  /** Buckets currently kept. */
  readonly size: number;
}

export interface WindowOptions {
  limit: number;
  windowMs: number;
  clock?: Clock;
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
  /** When the current fixed window ends (ms). */
  resetAt: number;
  /** 0 when allowed; otherwise ms until the same request would be allowed. */
  retryAfter: number;
}

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

function checkCount(n: number, what = 'n'): void {
  if (!(typeof n === 'number' && n > 0 && Number.isFinite(n))) throw new RangeError(`${what} must be a positive number, got ${n}`);
}

interface Waiter {
  n: number;
  resolve: () => void;
  reject: (e: unknown) => void;
  cleanup: () => void;
}

export class TokenBucket {
  readonly capacity: number;
  readonly refillPerSec: number;
  private level: number;
  private last: number;
  private readonly clock: Clock;
  private readonly queue: Waiter[] = [];
  private timer: unknown = null;

  constructor(options: BucketOptions) {
    checkCount(options.capacity, 'capacity');
    if (!(options.refillPerSec >= 0 && Number.isFinite(options.refillPerSec))) throw new RangeError(`refillPerSec must be >= 0, got ${options.refillPerSec}`);
    this.capacity = options.capacity;
    this.refillPerSec = options.refillPerSec;
    this.clock = options.clock ?? realClock;
    this.level = Math.min(options.tokens ?? options.capacity, options.capacity);
    this.last = this.clock.now();
  }

  get tokens(): number {
    this.refill();
    return this.level;
  }

  tryRemove(n = 1): boolean {
    checkCount(n);
    this.refill();
    if (this.queue.length > 0 || n > this.level) return false;
    this.level -= n;
    return true;
  }

  removeTokens(n = 1, options: { signal?: AbortSignal } = {}): Promise<void> {
    try {
      checkCount(n);
      if (n > this.capacity) throw new RangeError(`cannot remove ${n} tokens from a bucket of ${this.capacity}`);
    } catch (e) {
      return Promise.reject(e);
    }
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.tryRemove(n)) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        const i = this.queue.indexOf(waiter);
        if (i >= 0) this.queue.splice(i, 1);
        reject(signal!.reason);
        this.pump();
      };
      const waiter: Waiter = { n, resolve, reject, cleanup: () => signal?.removeEventListener('abort', onAbort) };
      signal?.addEventListener('abort', onAbort, { once: true });
      this.queue.push(waiter);
      this.pump();
    });
  }

  private refill(): void {
    const now = this.clock.now();
    const elapsed = Math.max(0, now - this.last);
    this.last = Math.max(this.last, now);
    this.level = Math.min(this.capacity, this.level + (elapsed * this.refillPerSec) / 1000);
  }

  private pump(): void {
    this.refill();
    while (this.queue.length > 0 && this.queue[0].n <= this.level) {
      const w = this.queue.shift()!;
      this.level -= w.n;
      w.cleanup();
      w.resolve();
    }
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
    if (this.queue.length > 0 && this.refillPerSec > 0) {
      const wait = Math.max(1, Math.ceil(((this.queue[0].n - this.level) / this.refillPerSec) * 1000));
      this.timer = this.clock.setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
    }
  }
}

export function createKeyedLimiter(options: KeyedLimiterOptions): KeyedLimiter {
  const clock = options.clock ?? realClock;
  new TokenBucket({ ...options, clock }); // validates the options
  const idleMs = options.idleMs ?? (options.refillPerSec > 0 ? (options.capacity / options.refillPerSec) * 1000 : Infinity);
  const buckets = new Map<string, { bucket: TokenBucket; lastUsed: number }>();
  const sweep = () => {
    const now = clock.now();
    for (const [key, b] of buckets) if (now - b.lastUsed > idleMs) buckets.delete(key);
  };
  return {
    tryRemove(key, n = 1) {
      sweep();
      let b = buckets.get(key);
      if (!b) {
        b = { bucket: new TokenBucket({ capacity: options.capacity, refillPerSec: options.refillPerSec, tokens: options.tokens, clock }), lastUsed: 0 };
        buckets.set(key, b);
      }
      b.lastUsed = clock.now();
      return b.bucket.tryRemove(n);
    },
    tokens(key) {
      sweep();
      const b = buckets.get(key);
      return b ? b.bucket.tokens : Math.min(options.tokens ?? options.capacity, options.capacity);
    },
    get size() {
      sweep();
      return buckets.size;
    },
  };
}

export class SlidingWindow {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly clock: Clock;
  private windowStart = -Infinity;
  private prev = 0;
  private curr = 0;

  constructor(options: WindowOptions) {
    checkCount(options.limit, 'limit');
    checkCount(options.windowMs, 'windowMs');
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.clock = options.clock ?? realClock;
  }

  hit(n = 1): RateResult {
    checkCount(n);
    if (n > this.limit) throw new RangeError(`cannot take ${n} from a limit of ${this.limit}`);
    const W = this.windowMs;
    const now = this.clock.now();
    const start = Math.floor(now / W) * W;
    if (start !== this.windowStart) {
      this.prev = start - this.windowStart === W ? this.curr : 0;
      this.curr = 0;
      this.windowStart = start;
    }
    const e = now - start;
    // count = prev * (W - e) / W + curr, compared after multiplying by W to stay in integers.
    const scaled = (extra: number) => this.prev * (W - e) + (this.curr + extra) * W;
    const resetAt = start + W;
    if (scaled(n) <= this.limit * W) {
      this.curr += n;
      return { allowed: true, remaining: Math.max(0, Math.floor((this.limit * W - scaled(0)) / W)), resetAt, retryAfter: 0 };
    }
    let at: number;
    const room = this.limit - this.curr - n;
    const inThisWindow = room >= 0 && this.prev > 0 ? W - (W * room) / this.prev : Infinity;
    if (inThisWindow < W) at = start + inThisWindow;
    else at = start + W + Math.max(0, W - (W * (this.limit - n)) / this.curr);
    return { allowed: false, remaining: Math.max(0, Math.floor((this.limit * W - scaled(0)) / W)), resetAt, retryAfter: Math.ceil(at - now) };
  }
}
