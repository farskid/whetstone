/** Injected time in ms. Defaults to the real clock. */
export interface Clock {
  now(): number;
}

export interface BucketOptions {
  /** A positive number. */
  capacity: number;
  /** Tokens gained per second, continuously; >= 0. */
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
