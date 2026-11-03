import type { PMapOptions, PMapInput } from './types';

export const pMapSkip: unique symbol = Symbol('pMapSkip');

export function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<Exclude<R, typeof pMapSkip>[]> {
  throw new Error('Not implemented');
}
