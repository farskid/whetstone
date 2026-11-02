```ts
class Group<T> {
  // ...
  forget(key: string | number): void;
}
```

`forget(key)` drops both the cached value and the in-flight call for that key. Callers already waiting still get the old call's result, but the next `do` calls its `fn`. The old call's result must not be cached when it lands.
