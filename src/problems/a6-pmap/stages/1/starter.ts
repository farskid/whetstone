import type { PMapOptions, PMapInput } from './types';

export function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<R[]> {
  throw new Error('Not implemented');
}
