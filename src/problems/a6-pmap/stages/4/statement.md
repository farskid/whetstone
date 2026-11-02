Make it cancellable.

```ts
interface PMapOptions {
  // ...stage 3, plus:
  signal?: AbortSignal;
}
```

- If `signal` is already aborted, reject with `signal.reason` without calling the mapper.
- If it aborts later, reject with `signal.reason` at once and start no new calls. Calls already running are left to finish; their results are ignored.
