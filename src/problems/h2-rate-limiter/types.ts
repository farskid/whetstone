/** Injected time in ms. Defaults to the real clock. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
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

/** `limit` and `windowMs` must be positive. */
export interface WindowOptions {
  limit: number;
  windowMs: number;
  clock?: Clock;
}

/** What hit() reports, enough for rate-limit response headers. */
export interface RateResult {
  allowed: boolean;
  remaining: number;
  /** When the current fixed window ends (ms). */
  resetAt: number;
  /** 0 when allowed; otherwise ms until the same request would be allowed. */
  retryAfter: number;
}

/** Options for `removeTokens`. */
export interface RemoveTokensOptions {
  /** Aborting it rejects the wait and gives up the place in line. */
  signal?: AbortSignal;
}
