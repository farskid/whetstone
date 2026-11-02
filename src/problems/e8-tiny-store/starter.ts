import type { StoreApi, Initializer, PersistOptions } from './types';

export function create<T>(initializer: Initializer<T>): StoreApi<T> {
  throw new Error('Not implemented');
}

export function persist<T>(initializer: Initializer<T>, options: PersistOptions<T>): Initializer<T> {
  throw new Error('Not implemented');
}
