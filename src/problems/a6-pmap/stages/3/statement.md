Choose what a failure does.

```ts
interface PMapOptions {
  concurrency?: number;
  stopOnError?: boolean;  // default true
}
```

- `stopOnError: true` (or left out): the first mapper error rejects the result at once. No new items are pulled and no new calls start; calls already running are left to finish. <!-- tests: stopOnError: rejects with the first error and starts nothing new -->
- `stopOnError: false`: keep going through all items, then, if any failed, reject with an `AggregateError` whose `errors` are in **input** order (not the order they failed in). If none failed, resolve as usual. <!-- tests: stopOnError false: runs everything, then AggregateError in input order -->
