import type { PMapOptions } from './types';

export function pMap<T, R>(
  input: Iterable<T | Promise<T>>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<R[]> {
  throw new Error('Not implemented');
}
