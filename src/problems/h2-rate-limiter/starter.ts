import type { BucketOptions, KeyedLimiterOptions, KeyedLimiter, WindowOptions, RateResult, RemoveTokensOptions } from './types';

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

  removeTokens(n = 1, options: RemoveTokensOptions = {}): Promise<void> {
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
