Cache results.

```ts
interface GroupOptions {
  ttl?: number;                // cache successful results for this many ms. Unset = no cache
  clock?: { now(): number };   // default: Date
}

class Group<T> {
  constructor(options?: GroupOptions);
  do(key: string | number, fn: () => T | Promise<T>): Promise<T>;
}
```

- A successful result is cached with the time it resolved. While its age (`now - resolvedAt`) is **less than** `ttl`, `do` resolves with it without calling `fn`. <!-- tests: ttl: cached result served until its age reaches ttl | ttl age counts from when the call resolved -->
- Errors are never cached. <!-- tests: errors are never cached -->
