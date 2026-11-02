Let the caller stop early.

```ts
class AbortError extends Error {
  constructor(errorOrMessage: Error | string);
  readonly originalError: Error;
}

interface RetryOptions {
  // ...stages 1–2, plus:
  shouldRetry?: (error: Error) => boolean | Promise<boolean>;
}
```

- If the error is an `AbortError`, reject with its `originalError` at once.
- `new AbortError(err)` keeps `err` as `originalError`. `new AbortError('msg')` uses itself as `originalError`. Its `name` is `'AbortError'`.
- Otherwise, if retries are left and `shouldRetry` is given and resolves to `false`, reject with the error instead of waiting.
