```ts
class Group<T> {
  // ...
  forget(key: string | number): void;
}
```

`forget(key)` drops both the cached value and the in-flight call for that key. Callers already waiting still get the old call's result, but the next `do` calls its `fn`. The old call's result must not be cached when it lands. <!-- tests: forget during a call: waiters get the old result, next caller starts fresh | forget drops the cached value | a call forgotten mid-flight does not land in the cache -->
