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

export class TokenBucket {
  constructor(options: BucketOptions) {
    throw new Error('Not implemented');
  }

  get tokens(): number {
    throw new Error('Not implemented');
  }

  tryRemove(n = 1): boolean {
    throw new Error('Not implemented');
  }

  removeTokens(n = 1, options: { signal?: AbortSignal } = {}): Promise<void> {
    throw new Error('Not implemented');
  }
}

export function createKeyedLimiter(options: KeyedLimiterOptions): KeyedLimiter {
  throw new Error('Not implemented');
}

export class SlidingWindow {
  constructor(options: WindowOptions) {
    throw new Error('Not implemented');
  }

  hit(n = 1): RateResult {
    throw new Error('Not implemented');
  }
}
