/** Time source; `now()` is in ms. */
export interface Clock {
  now(): number;
}

export type WebhookErrorCode = 'malformed' | 'no_match' | 'too_old';

/** The parsed Stripe-Signature header. */
export interface ParsedSignature {
  timestamp: number;
  signatures: string[];
}

export interface VerifyOptions {
  /** The raw request body, exactly as received. */
  payload: string;
  header: string;
  secrets: string;
  /** Max age of the timestamp in seconds (default 300). */
  toleranceSec?: number;
  clock?: Clock;
}

export type ProcessResult<R> = { status: 'applied'; result: R; duplicate: boolean };

/** Options for createWebhookHandler. */
export interface HandlerOptions<E, R> {
  handle: (event: E) => Promise<R>;
}

/** What `verifySignature` resolves to. */
export interface VerifyResult {
  /** The header's timestamp, in seconds. */
  timestamp: number;
}

/** What `createWebhookHandler` returns. */
export interface WebhookHandler<E, R> {
  process(event: E): Promise<ProcessResult<R>>;
}
