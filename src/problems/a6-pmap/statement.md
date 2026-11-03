# Ordered concurrent map

Write `pMap`, a small version of **p-map**: run an async mapper over many items, at most `concurrency` at a time, and get the results back in input order.

```ts
const pages = await pMap(urls, (url) => fetch(url).then((r) => r.text()), { concurrency: 4 });
```

## API

```ts
const pMapSkip: unique symbol;

interface PMapOptions {
  concurrency?: number;   // default Infinity. Integer >= 1, or Infinity
  stopOnError?: boolean;  // default true
  signal?: AbortSignal;
}

type PMapInput<T> = Iterable<T | Promise<T>> | AsyncIterable<T>;

function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options?: PMapOptions,
): Promise<Exclude<R, typeof pMapSkip>[]>;
```

## Rules

**Concurrency and order**
- At most `concurrency` mapper calls are in flight at once. Start a new one as soon as one finishes.
- The result array is in **input** order, whatever order the calls finish in.
- `index` is the item's position in the input (0-based).
- If an item from a sync iterable is a promise, await it before calling the mapper.
- `concurrency` that isn't an integer ≥ 1 (or `Infinity`) makes `pMap` throw a `TypeError` synchronously.
- Empty input resolves `[]`.

**Lazy input**
- Read the input lazily. Pull the next item only when a slot is free, so the iterator is never more than `concurrency` items ahead of the finished calls. This makes infinite or expensive iterators safe.
- Sync and async iterables both work.
- An error thrown by the iterator rejects the result.

**pMapSkip.** If the mapper returns (or resolves to) `pMapSkip`, that item is left out of the results. The other results keep their relative order.

**Errors**
- `stopOnError: true`: the first mapper error rejects the result at once. No new items are pulled and no new calls start; calls already running are left to finish.
- `stopOnError: false`: keep going through all items, then, if any failed, reject with an `AggregateError` whose `errors` are in **input** order.

**Abort.** If `signal` aborts (or is already aborted), reject with `signal.reason` and start no new calls.
