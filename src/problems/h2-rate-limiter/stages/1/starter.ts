import type { BucketOptions } from './types';

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
}
