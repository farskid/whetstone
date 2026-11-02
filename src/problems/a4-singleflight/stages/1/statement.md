Build `Group`, a mix of Go's **singleflight** and **SWR**'s dedupe. When ten components ask for `user:42` at once, only one request goes out, and everyone gets its result.

```ts
const users = new Group<User>();
const user = await users.do(`user:${id}`, () => fetchUser(id));
```

```ts
class Group<T> {
  do(key: string | number, fn: () => T | Promise<T>): Promise<T>;
}
```

- A key is compared as a string, so `1` and `'1'` are the **same** key. <!-- tests: keys 1 and "1" are the same key -->
- While a call for a key is in flight, every `do(key, …)` joins it: their `fn` isn't called, and they all get the same value or the same rejection. <!-- tests: concurrent calls with the same key share one fn call | every waiter sees the same rejection -->
- A sync throw from `fn` counts as a rejection. <!-- tests: a sync throw from fn becomes a rejection -->
- Once the call settles the key is free again, so the next `do` calls its `fn`. <!-- tests: without ttl, a call after settling runs fn again -->
