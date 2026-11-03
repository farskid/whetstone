import type { PMapOptions, PMapInput } from './types';

export const pMapSkip: unique symbol = Symbol('pMapSkip');

export function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options: PMapOptions = {},
): Promise<Exclude<R, typeof pMapSkip>[]> {
  const { concurrency = Infinity } = options;
  if (!(concurrency === Infinity || (Number.isInteger(concurrency) && concurrency >= 1))) {
    throw new TypeError(`Expected concurrency to be an integer >= 1 or Infinity, got ${concurrency}`);
  }

  return new Promise((resolve, reject) => {
    const isAsync = typeof (input as any)[Symbol.asyncIterator] === 'function';
    const iterator: Iterator<T | Promise<T>> | AsyncIterator<T> = isAsync
      ? (input as AsyncIterable<T>)[Symbol.asyncIterator]()
      : (input as Iterable<T>)[Symbol.iterator]();
    const results: unknown[] = [];
    let nextIndex = 0;
    let running = 0;
    let pulling = false;
    let exhausted = false;
    let finished = false;

    const fail = (e: unknown) => {
      if (finished) return;
      finished = true;
      reject(e);
    };

    const done = () => {
      if (finished) return;
      finished = true;
      resolve(results.filter((r) => r !== pMapSkip) as Exclude<R, typeof pMapSkip>[]);
    };

    const pump = async () => {
      if (pulling) return;
      pulling = true;
      try {
        while (!finished && !exhausted && running < concurrency) {
          let step: IteratorResult<T | Promise<T>>;
          try {
            step = await iterator.next();
          } catch (e) {
            return fail(e);
          }
          if (finished) return;
          if (step.done) { exhausted = true; break; }
          const index = nextIndex++;
          running++;
          results.push(undefined);
          (async () => {
            try {
              const item = await step.value;
              if (finished) return;
              results[index] = await mapper(item as T, index);
            } catch (error) {
              return fail(error);
            } finally {
              running--;
            }
            if (!finished) pump();
          })();
        }
      } finally {
        pulling = false;
      }
      if (exhausted && running === 0) done();
    };
    pump();
  });
}
