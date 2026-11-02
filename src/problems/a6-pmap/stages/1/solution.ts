import type { PMapOptions } from './types';

export function pMap<T, R>(
  input: Iterable<T | Promise<T>>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<R[]> {
  const { concurrency = Infinity } = options;
  if (!(concurrency === Infinity || (Number.isInteger(concurrency) && concurrency >= 1))) {
    throw new TypeError(`Expected concurrency to be an integer >= 1 or Infinity, got ${concurrency}`);
  }
  const items = Array.from(input);
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(await items[index], index);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  return Promise.all(workers).then(() => results);
}
