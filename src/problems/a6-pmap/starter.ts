export const pMapSkip: unique symbol = Symbol('pMapSkip');

export interface PMapOptions {
  concurrency?: number;
  stopOnError?: boolean;
  signal?: AbortSignal;
}

export function pMap<T, R>(
  input: Iterable<T | Promise<T>> | AsyncIterable<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<Exclude<R, typeof pMapSkip>[]> {
  throw new Error('Not implemented');
}
