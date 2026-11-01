// Bug: close() throws away buffered values.
export interface Received<T> { value: T | undefined; done: boolean }

/** A pending receive. accept() returns false if this waiter was already satisfied elsewhere (select). */
interface Receiver<T> { accept(r: Received<T>): boolean }
interface Sender<T> { value: T; resolve(): void; reject(e: Error): void }

export class Channel<T> implements AsyncIterable<T> {
  private buffer: T[] = [];
  private senders: Sender<T>[] = [];
  private receivers: Receiver<T>[] = [];
  private isClosed = false;

  constructor(private capacity = 0) {
    if (!(capacity >= 0)) throw new RangeError('capacity must be >= 0');
  }

  get closed(): boolean {
    return this.isClosed;
  }

  send(value: T): Promise<void> {
    if (this.isClosed) return Promise.reject(new Error('Channel closed'));
    while (this.receivers.length) {
      if (this.receivers.shift()!.accept({ value, done: false })) return Promise.resolve();
    }
    if (this.buffer.length < this.capacity) {
      this.buffer.push(value);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => this.senders.push({ value, resolve, reject }));
  }

  /** Take a result now if one is available. */
  tryReceive(): Received<T> | null {
    if (this.buffer.length) {
      const value = this.buffer.shift()!;
      const s = this.senders.shift();
      if (s) { this.buffer.push(s.value); s.resolve(); }
      return { value, done: false };
    }
    const s = this.senders.shift();
    if (s) { s.resolve(); return { value: s.value, done: false }; }
    if (this.isClosed) return { value: undefined, done: true };
    return null;
  }

  /** Register a waiter (used by receive and select). */
  wait(r: Receiver<T>): () => void {
    this.receivers.push(r);
    return () => { const i = this.receivers.indexOf(r); if (i >= 0) this.receivers.splice(i, 1); };
  }

  receive(): Promise<Received<T>> {
    const now = this.tryReceive();
    if (now) return Promise.resolve(now);
    return new Promise((resolve) => { this.wait({ accept: (r) => { resolve(r); return true; } }); });
  }

  close(): void {
    if (this.isClosed) return;
    this.isClosed = true;
    this.buffer.length = 0;
    for (const s of this.senders.splice(0)) s.reject(new Error('Channel closed'));
    for (const r of this.receivers.splice(0)) r.accept({ value: undefined, done: true });
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for (;;) {
      const { value, done } = await this.receive();
      if (done) return;
      yield value as T;
    }
  }
}

export function merge<T>(...channels: Channel<T>[]): Channel<T> {
  const out = new Channel<T>();
  let open = channels.length;
  if (!open) out.close();
  for (const ch of channels) {
    (async () => {
      for await (const v of ch) await out.send(v);
      if (--open === 0) out.close();
    })();
  }
  return out;
}

export function select<T>(channels: Channel<T>[]): Promise<{ index: number; value: T | undefined; done: boolean }> {
  for (let i = 0; i < channels.length; i++) {
    const r = channels[i].tryReceive();
    if (r) return Promise.resolve({ index: i, ...r });
  }
  return new Promise((resolve) => {
    let settled = false;
    const cancels: (() => void)[] = [];
    channels.forEach((ch, index) => {
      cancels.push(ch.wait({
        accept: (r) => {
          if (settled) return false;
          settled = true;
          for (const c of cancels) c();
          resolve({ index, ...r });
          return true;
        },
      }));
    });
  });
}
