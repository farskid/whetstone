# Singleflight / request dedupe

Build `Group`, a mix of Go's **singleflight** and **SWR**'s dedupe. When ten components ask for `user:42` at once, only one request goes out, and everyone gets its result.

```ts
const users = new Group<User>({ ttl: 60_000, staleAfter: 10_000 });
const user = await users.do(`user:${id}`, () => fetchUser(id));
```

## API

```ts
interface GroupOptions {
  ttl?: number;          // cache successful results for this many ms. Unset = no cache
  staleAfter?: number;   // only with ttl: from this age on, serve the cached value and refresh in the background
  clock?: { now(): number };   // default: Date
}

class Group<T> {
  constructor(options?: GroupOptions);
  do(key: string | number, fn: () => T | Promise<T>): Promise<T>;
  forget(key: string | number): void;
}
```

## Rules

**Keys.** A key is compared as a string, so `1` and `'1'` are the **same** key.

**Sharing**
- While a call for a key is in flight, every `do(key, …)` joins it: their `fn` isn't called, and they all get the same value or the same rejection.
- A sync throw from `fn` counts as a rejection.
- Without `ttl`, once the call settles the key is free again, so the next `do` calls its `fn`.

**Cache (`ttl` set)**
- A successful result is cached with the time it resolved. While its age (`now - resolvedAt`) is **less than** `ttl`, `do` resolves with it without calling `fn`.
- Errors are never cached.

**forget(key)** drops both the cached value and the in-flight call for that key. Callers already waiting still get the old call's result, but the next `do` calls its `fn`. The old call's result must not be cached when it lands.

**Stale-while-revalidate (`staleAfter` set, below `ttl`)**
- With a cached value whose age is at least `staleAfter` (and less than `ttl`), `do` resolves **right away** with the cached value and starts one background refresh with its `fn`.
- While a refresh is running, more `do` calls also get the cached value and don't start another refresh.
- A refresh that succeeds replaces the cached value (with a new timestamp). A refresh that fails keeps the old value, and the next stale `do` tries again. A failed refresh never causes an unhandled rejection.
- At age `ttl` or more, the value has expired and `do` behaves like a miss.
