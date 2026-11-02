# Circuit breaker: failing fast

When a service is down, retrying it over and over only makes things worse. A circuit breaker notices the failures and stops calling the service (it "opens"). Build a `CircuitBreaker` like **opossum**'s.

```ts
const breaker = new CircuitBreaker(fetchUser, { failureThreshold: 3 });
await breaker.fire(42); // calls fetchUser(42)
// ...after 3 failures in a row:
breaker.state;          // 'open'
await breaker.fire(42); // rejects with OpenCircuitError without calling fetchUser
```

## Failing fast

`new CircuitBreaker(fn, options)` wraps an async function. `breaker.fire(...args)` calls `fn(...args)` and returns its result or its error.

- **Failures.** A rejection counts as a failure, and so does a synchronous throw. The caller gets the original error.
- **Opening.** After `failureThreshold` failures in a row (default 5), the breaker **opens**. Any success resets that count.
- **While open.** `fire()` rejects right away with an `OpenCircuitError` and does not call `fn`.
- **`breaker.state`** is `'closed'` or `'open'`.
- **Staying open.** In this stage an open breaker stays open for good, and results of calls that were already running when it opened are ignored by the breaker (their callers still get them).
- **`clock`** may be passed in the options. This stage doesn't use it.
