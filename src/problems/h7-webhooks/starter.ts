export interface Clock {
  now(): number;
}

export type WebhookErrorCode = 'malformed' | 'no_match' | 'too_old';

export class WebhookError extends Error {
  readonly code: WebhookErrorCode;
  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
  }
}

export interface ParsedSignature {
  timestamp: number;
  signatures: string[];
}

export function parseSignatureHeader(header: string): ParsedSignature {
  throw new Error('Not implemented');
}

/** Compares in time that depends only on the length, not on where the strings differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  throw new Error('Not implemented');
}

export interface VerifyOptions {
  /** The raw request body, exactly as received. */
  payload: string;
  header: string;
  secrets: string | string[];
  /** Max age of the timestamp in seconds (default 300). */
  toleranceSec?: number;
  clock?: Clock;
}

export function verifySignature(options: VerifyOptions): Promise<{ timestamp: number }> {
  throw new Error('Not implemented');
}

export type ProcessResult<R> =
  | { status: 'applied'; result: R; duplicate: boolean }
  | { status: 'stale'; duplicate: boolean };

export interface HandlerOptions<E, R> {
  handle: (event: E) => Promise<R>;
  /** Events with the same key run one at a time, in arrival order. */
  getKey?: (event: E) => string;
  /** With getKey: an event is applied only if its version is newer than the last applied one for its key. */
  getVersion?: (event: E) => number;
}

export function createWebhookHandler<E extends { id: string }, R>(options: HandlerOptions<E, R>): { process(event: E): Promise<ProcessResult<R>> } {
  throw new Error('Not implemented');
}
