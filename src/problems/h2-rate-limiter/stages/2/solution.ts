import type { Clock, BucketOptions, KeyedLimiterOptions, KeyedLimiter } from './types';

const realClock: Clock = {
  now: () => Date.now(),
};

function checkCount(n: number, what = 'n'): void {
  if (!(typeof n === 'number' && n > 0 && Number.isFinite(n))) throw new RangeError(`${what} must be a positive number, got ${n}`);
}

export class TokenBucket {
  readonly capacity: number;
  readonly refillPerSec: number;
  private level: number;
  private last: number;
  private readonly clock: Clock;

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
    if (n > this.level) return false;
    this.level -= n;
    return true;
  }

  private refill(): void {
    const now = this.clock.now();
    const elapsed = Math.max(0, now - this.last);
    this.last = Math.max(this.last, now);
    this.level = Math.min(this.capacity, this.level + (elapsed * this.refillPerSec) / 1000);
  }
}

export function createKeyedLimiter(options: KeyedLimiterOptions): KeyedLimiter {
  const clock = options.clock ?? realClock;
  new TokenBucket({ ...options, clock }); // validates the options
  const idleMs = options.idleMs ?? (options.refillPerSec > 0 ? (options.capacity / options.refillPerSec) * 1000 : Infinity);
  const buckets = new Map<string, { bucket: TokenBucket; lastUsed: number }>();
  const sweep = () => {
    const now = clock.now();
    for (const [key, b] of buckets) if (now - b.lastUsed >= idleMs) buckets.delete(key);
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
