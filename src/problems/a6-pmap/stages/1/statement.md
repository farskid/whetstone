Write `pMap`, a small version of **p-map**: run an async mapper over many items, at most `concurrency` at a time, and get the results back in input order.

```ts
const pages = await pMap(urls, (url) => fetch(url).then((r) => r.text()), { concurrency: 4 });
```

```ts
interface PMapOptions {
  concurrency?: number;   // default Infinity. Integer >= 1, or Infinity
}

type PMapInput<T> = Iterable<T | Promise<T>>;

function pMap<T, R>(
  input: PMapInput<T>,
  mapper: (item: T, index: number) => R | Promise<R>,
  options?: PMapOptions,
): Promise<R[]>;
```

- At most `concurrency` mapper calls are in flight at once. Start a new one as soon as one finishes. <!-- tests: never more than `concurrency` calls at once, and a freed slot is reused right away -->
- The result array is in **input** order, whatever order the calls finish in. <!-- tests: results are in input order even when calls finish out of order -->
- `index` is the item's position in the input (0-based). <!-- tests: mapper gets (item, index); promise items are awaited first -->
- If an item is a promise, await it before calling the mapper. <!-- tests: mapper gets (item, index); promise items are awaited first -->
- `concurrency` that isn't an integer ≥ 1 (or `Infinity`) makes `pMap` throw a `TypeError` **synchronously** (not a rejected promise). Leaving it out means `Infinity`. <!-- tests: invalid concurrency throws a TypeError synchronously -->
- Empty input resolves `[]`. <!-- tests: empty input resolves [] -->
- If a mapper throws or rejects, reject with that error. (Stage 3 says more about errors.)
