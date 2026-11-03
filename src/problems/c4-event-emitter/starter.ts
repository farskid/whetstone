import type { EventMap, Listener, Wildcard, EmitterOptions, OnceOptions } from './types';

type AnyMap = Record<string, any[]>;

export class Emitter<E extends EventMap = AnyMap> {
  constructor(options: EmitterOptions = {}) {}

  on<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this;
  on(name: '*', fn: Wildcard<E>): this;
  on(name: string, fn: (...args: any[]) => void): this {
    throw new Error('Not implemented');
  }

  once<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    throw new Error('Not implemented');
  }

  prependListener<K extends keyof E & string>(name: K, fn: Listener<E[K]>): this {
    throw new Error('Not implemented');
  }

  off<K extends keyof E & string>(name: K | '*', fn: (...args: any[]) => void): this {
    throw new Error('Not implemented');
  }

  emit<K extends keyof E & string>(name: K, ...args: E[K]): boolean {
    throw new Error('Not implemented');
  }

  listenerCount(name: (keyof E & string) | '*'): number {
    throw new Error('Not implemented');
  }

  setMaxListeners(n: number): this {
    throw new Error('Not implemented');
  }
}

export function once<E extends EventMap, K extends keyof E & string>(
  emitter: Emitter<E>,
  name: K,
  options: OnceOptions = {},
): Promise<E[K]> {
  throw new Error('Not implemented');
}
