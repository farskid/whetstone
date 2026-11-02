import type { Release } from './types';

export class Mutex {
  private held = false;
  private queue: (() => void)[] = [];

  get locked(): boolean { return this.held; }

  private take(): Release {
    this.held = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.held = false;
      this.queue.shift()?.();
    };
  }

  acquire(): Promise<Release> {
    if (!this.held && !this.queue.length) return Promise.resolve(this.take());
    return new Promise((resolve) => this.queue.push(() => resolve(this.take())));
  }

  async runExclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
