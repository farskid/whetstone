# Promise.allSettled

**Warm-up, about 5 minutes.**

Write `allSettled(inputs)`, your own version of the built-in `Promise.allSettled`. It waits until **every** input has settled and then resolves with one result object per input.

```ts
const results = await allSettled([fetchUser(), Promise.reject(new Error('nope')), 42]);
// [
//   { status: 'fulfilled', value: { id: 1 } },
//   { status: 'rejected',  reason: Error('nope') },
//   { status: 'fulfilled', value: 42 },
// ]
```

## API

```ts
type SettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: unknown };

function allSettled<T>(inputs: Iterable<T | PromiseLike<T>>): Promise<SettledResult<T>[]>;
```

## Rules

- The returned promise **never rejects**. A rejected input becomes `{ status: 'rejected', reason }`, where `reason` is exactly what it rejected with (it can be a string, `undefined` and so on).
- Results come back in **input order**, not in the order the inputs settled.
- Fulfilled entries have exactly the keys `status` and `value`. Rejected entries have exactly `status` and `reason`.
- Plain values (not promises) count as already fulfilled. Thenables (objects with a `then` method) are adopted like real promises.
- `inputs` can be any iterable: an array, a `Set`, a generator.
- Empty input resolves with `[]`.
- Don't call the built-in `Promise.allSettled`. The tests disable it.
