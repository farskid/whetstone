Read the input lazily, accept async iterables, and let the mapper drop items.

```ts
const pMapSkip: unique symbol;

type PMapInput<T> = Iterable<T | Promise<T>> | AsyncIterable<T>;

function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options?: PMapOptions,
): Promise<Exclude<R, typeof pMapSkip>[]>;
```

- Pull the next item only when a slot is free, so the iterator is never more than `concurrency` items ahead of the finished calls. Don't copy the input into an array first: infinite or expensive iterators must be safe. <!-- tests: pulls from the iterator only as slots free up -->
- Sync and async iterables both work. <!-- tests: async iterables work -->
- An error thrown by the iterator rejects the result. <!-- tests: an iterator that throws rejects the result -->
- If the mapper returns (or resolves to) `pMapSkip`, that item is left out of the results. The other results keep their relative order. <!-- tests: pMapSkip leaves items out of the result -->
