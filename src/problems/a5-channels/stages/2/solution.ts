import type { Received } from './types';

interface Sender<T> { value: T; resolve(): void }

export class Channel<T> {
  private buffer: T[] = [];
  private senders: Sender<T>[] = [];
  private receivers: ((r: Received<T>) => void)[] = [];

  constructor(private capacity = 0) {}

  send(value: T): Promise<void> {
    const r = this.receivers.shift();
    if (r) { r({ value, done: false }); return Promise.resolve(); }
    if (this.buffer.length < this.capacity) { this.buffer.push(value); return Promise.resolve(); }
    return new Promise((resolve) => this.senders.push({ value, resolve }));
  }

  receive(): Promise<Received<T>> {
    if (this.buffer.length) {
      const value = this.buffer.shift()!;
      const s = this.senders.shift();
      if (s) { this.buffer.push(s.value); s.resolve(); }
      return Promise.resolve({ value, done: false });
    }
    const s = this.senders.shift();
    if (s) { s.resolve(); return Promise.resolve({ value: s.value, done: false }); }
    return new Promise((resolve) => this.receivers.push(resolve));
  }
}
