// Bug: with stopOnError a failure rejects, but new calls keep starting.
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
  const { concurrency = Infinity, stopOnError = true, signal } = options;
  if (!(concurrency === Infinity || (Number.isInteger(concurrency) && concurrency >= 1))) {
    throw new TypeError(`Expected concurrency to be an integer >= 1 or Infinity, got ${concurrency}`);
  }

  return new Promise((resolve, reject) => {
    const isAsync = typeof (input as any)[Symbol.asyncIterator] === 'function';
    const iterator: Iterator<T | Promise<T>> | AsyncIterator<T> = isAsync
      ? (input as AsyncIterable<T>)[Symbol.asyncIterator]()
      : (input as Iterable<T>)[Symbol.iterator]();
    const results: unknown[] = [];
    const errors: { index: number; error: unknown }[] = [];
    let nextIndex = 0;
    let running = 0;
    let pulling = false;
    let exhausted = false;
    let finished = false;

    const fail = (e: unknown) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      reject(e);
    };
    function onAbort() { fail(signal!.reason); }
    if (signal?.aborted) return fail(signal.reason);
    signal?.addEventListener('abort', onAbort);

    const done = () => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      if (errors.length) {
        errors.sort((a, b) => a.index - b.index);
        return reject(new AggregateError(errors.map((e) => e.error), 'pMap: some mappers failed'));
      }
      resolve(results.filter((r) => r !== pMapSkip) as Exclude<R, typeof pMapSkip>[]);
    };

    const pump = async () => {
      if (pulling) return;
      pulling = true;
      try {
        while (!exhausted && running < concurrency) {
          let step: IteratorResult<T | Promise<T>>;
          try {
            step = await iterator.next();
          } catch (e) {
            return fail(e);
          }
          if (step.done) { exhausted = true; break; }
          const index = nextIndex++;
          running++;
          results.push(undefined);
          (async () => {
            try {
              const item = await step.value;
              results[index] = await mapper(item as T, index);
            } catch (error) {
              if (stopOnError) return fail(error);
              errors.push({ index, error });
            } finally {
              running--;
            }
            pump();
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
