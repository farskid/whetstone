import type { Received } from './types';

export class Channel<T> {
  send(value: T): Promise<void> {
    throw new Error('Not implemented');
  }

  receive(): Promise<Received<T>> {
    throw new Error('Not implemented');
  }
}
