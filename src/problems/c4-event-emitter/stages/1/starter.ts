import type { EventMap, Listener } from './types';

type AnyMap = Record<string, any[]>;

export class Emitter<E extends EventMap = AnyMap> {
  on<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    throw new Error('Not implemented');
  }

  off<K extends keyof E & string>(name: K, fn: (...args: any[]) => void): this {
    throw new Error('Not implemented');
  }

  emit<K extends keyof E & string>(name: K, ...args: E[K]): boolean {
    throw new Error('Not implemented');
  }

  listenerCount(name: keyof E & string): number {
    throw new Error('Not implemented');
  }
}
