# Circuit breaker

When a service is down, retrying it over and over only makes things worse. A circuit breaker notices the failures, stops calling the service for a while (it "opens"), and lets one test call through later. Build a `CircuitBreaker` like **opossum**'s.

## Failing fast

`new CircuitBreaker(fn, options)` wraps an async function. `breaker.fire(...args)` calls `fn(...args)` and returns its result or its error.

- **Failures.** A rejection counts as a failure, and so does a synchronous throw. The caller gets the original error.
- **Opening.** After `failureThreshold` failures in a row (default 5), the breaker **opens**. Any success resets that count.
- **While open.** `fire()` rejects right away with an `OpenCircuitError` and does not call `fn`.
- **`breaker.state`** is `'closed'`, `'open'` or `'halfOpen'`.

## Half-open

- **When.** `resetTimeout` ms after opening (default 30000, timed with the injected `clock`), the breaker becomes **half-open**.
- **Trials.** While half-open, up to `halfOpenMax` calls (default 1) are let through at once as trials. Any more are rejected with `OpenCircuitError`.
- **The first trial decides.**
  - If it succeeds, the breaker **closes** with all counts reset.
  - If it fails, the breaker **opens** again for another full `resetTimeout`.
- **Results that arrive too late.** A call that was started before the breaker last changed state, and finishes after that change, doesn't affect the breaker. Its caller still gets its result or error.

## Rolling window

`window: { durationMs, errorPercentage, volumeThreshold = 1 }` adds a rule based on the error rate:

- **What's counted.** Every finished call from the last `durationMs` ms. A call exactly `durationMs` old has already dropped out.
- **When it opens.** When a failure brings the window to at least `volumeThreshold` calls, of which at least `errorPercentage`% failed. Only a failure can open the breaker.
- **With `failureThreshold`.** When a window is given, there's no default `failureThreshold`. If you also set one, either rule can open the breaker.
- **`timeout`** (ms, optional). A call that takes longer than this rejects with a `TimeoutError` and counts as a failure. Its result, if it arrives later, is ignored. Clear the timer when the call finishes in time.

## Fallback and events

- **`breaker.fallback(fn)`** returns the breaker.
  - **When it's used:** after a failure, a timeout, or an `OpenCircuitError` rejection.
  - **What happens:** `fire()` resolves with `fn(error, ...args)` instead of rejecting.
- **`breaker.on(event, listener)`** returns a function that unsubscribes. The events are:

  | Event | Payload |
  |---|---|
  | `success` | the result |
  | `failure` | the error |
  | `timeout` | the `TimeoutError`, emitted just before `failure` |
  | `reject` | the `OpenCircuitError` |
  | `fallback` | the fallback's value |
  | `open`, `halfOpen`, `close` | none |

  `success` and `failure` come before any state change that they cause.
- **`errorFilter(error)`** marks errors that aren't the service's fault, such as a 400 from bad input. When it returns `true`:
  - The caller still gets the error.
  - It counts as a **success** for the breaker.
  - It emits no `failure` event and doesn't use the fallback.
