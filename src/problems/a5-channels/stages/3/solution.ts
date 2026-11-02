import type { Received } from './types';

interface Sender<T> { value: T; resolve(): void; reject(e: Error): void }

export class Channel<T> implements AsyncIterable<T> {
  private buffer: T[] = [];
  private senders: Sender<T>[] = [];
  private receivers: ((r: Received<T>) => void)[] = [];
  private isClosed = false;

  constructor(private capacity = 0) {}

  get closed(): boolean {
    return this.isClosed;
  }

  send(value: T): Promise<void> {
    if (this.isClosed) return Promise.reject(new Error('Channel closed'));
    const r = this.receivers.shift();
    if (r) { r({ value, done: false }); return Promise.resolve(); }
    if (this.buffer.length < this.capacity) { this.buffer.push(value); return Promise.resolve(); }
    return new Promise((resolve, reject) => this.senders.push({ value, resolve, reject }));
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
    if (this.isClosed) return Promise.resolve({ value: undefined, done: true });
    return new Promise((resolve) => this.receivers.push(resolve));
  }

  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    for (const s of this.senders.splice(0)) s.reject(new Error('Channel closed'));
    for (const r of this.receivers.splice(0)) r({ value: undefined, done: true });
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for (;;) {
      const { value, done } = await this.receive();
      if (done) return;
      yield value as T;
    }
  }
}
