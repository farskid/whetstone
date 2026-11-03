import type { Received, Selected } from './types';

export class Channel<T> implements AsyncIterable<T> {
  constructor(capacity = 0) {
    throw new Error('Not implemented');
  }

  get closed(): boolean {
    throw new Error('Not implemented');
  }

  send(value: T): Promise<void> {
    throw new Error('Not implemented');
  }

  receive(): Promise<Received<T>> {
    throw new Error('Not implemented');
  }

  close(): void {
    throw new Error('Not implemented');
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    throw new Error('Not implemented');
  }
}

export function merge<T>(...channels: Channel<T>[]): Channel<T> {
  throw new Error('Not implemented');
}

export function select<T>(channels: Channel<T>[]): Promise<Selected<T>> {
  throw new Error('Not implemented');
}
