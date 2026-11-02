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
