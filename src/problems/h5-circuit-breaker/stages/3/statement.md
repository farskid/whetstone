# Circuit breaker: rolling window

Failures in a row miss a service that fails half the time. Add an **error-rate window**, and a **timeout** that turns slow calls into failures.

```ts
const b = new CircuitBreaker(fn, { clock, timeout: 1000, window: { durationMs: 10_000, errorPercentage: 50, volumeThreshold: 4 } });
```

The `clock` now also needs `clearTimeout(id)`.

## Rolling window

`window: { durationMs, errorPercentage, volumeThreshold = 1 }` adds a rule based on the error rate:

- **What's counted.** Every finished call from the last `durationMs` ms. A call exactly `durationMs` old has already dropped out. <!-- tests: calls older than durationMs no longer count -->
- **When it opens.** When a failure brings the window to at least `volumeThreshold` calls, of which at least `errorPercentage`% failed. Only a failure can open the breaker. <!-- tests: opens on the error percentage once there is enough volume -->
- **With `failureThreshold`.** When a window is given, there's no default `failureThreshold`. If you also set one, either rule can open the breaker.
- **`timeout`** (ms, optional). A call that takes longer than this rejects with a `TimeoutError` and counts as a failure. Its result, if it arrives later, is ignored. Clear the timer when the call finishes in time. <!-- tests: a timeout counts as a failure -->

Everything from earlier stages still applies.
