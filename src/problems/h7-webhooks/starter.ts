import type { WebhookErrorCode, ParsedSignature, VerifyOptions, ProcessResult, HandlerOptions, VerifyResult, WebhookHandler } from './types';

export class WebhookError extends Error {
  readonly code: WebhookErrorCode;
  constructor(code: WebhookErrorCode, message: string) {
    super(message);
    this.name = 'WebhookError';
    this.code = code;
  }
}

export function parseSignatureHeader(header: string): ParsedSignature {
  throw new Error('Not implemented');
}

/** Compares in time that depends only on the length, not on where the strings differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  throw new Error('Not implemented');
}

export function verifySignature(options: VerifyOptions): Promise<VerifyResult> {
  throw new Error('Not implemented');
}

export function createWebhookHandler<E extends { id: string }, R>(options: HandlerOptions<E, R>): WebhookHandler<E, R> {
  throw new Error('Not implemented');
}
