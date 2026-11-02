# Circuit breaker: fallback and events

Add the parts that make a breaker pleasant to use: a **fallback** answer, **events** for monitoring, and an **errorFilter** for errors that aren't the service's fault.

```ts
const b = new CircuitBreaker(fn).fallback(() => 'cached');
b.on('open', () => alert('service down'));
await b.fire(); // 'cached' instead of a rejection
```

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

Everything from earlier stages still applies.
