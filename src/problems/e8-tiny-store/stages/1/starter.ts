import type { StoreApi, Initializer } from './types';

export function create<T>(initializer: Initializer<T>): StoreApi<T> {
  throw new Error('Not implemented');
}
