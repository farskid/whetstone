import type { Received } from './types';

interface Sender<T> { value: T; resolve(): void }

export class Channel<T> {
  private senders: Sender<T>[] = [];
  private receivers: ((r: Received<T>) => void)[] = [];

  send(value: T): Promise<void> {
    const r = this.receivers.shift();
    if (r) { r({ value, done: false }); return Promise.resolve(); }
    return new Promise((resolve) => this.senders.push({ value, resolve }));
  }

  receive(): Promise<Received<T>> {
    const s = this.senders.shift();
    if (s) { s.resolve(); return Promise.resolve({ value: s.value, done: false }); }
    return new Promise((resolve) => this.receivers.push(resolve));
  }
}
