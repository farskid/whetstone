# Circuit breaker: fallback and events

Add the parts that make a breaker pleasant to use: a **fallback** answer, **events** for monitoring, and an **errorFilter** for errors that aren't the service's fault.

```ts
const b = new CircuitBreaker(fn).fallback(() => 'cached');
b.on('open', () => alert('service down'));
await b.fire(); // 'cached' instead of a rejection
```

## Fallback and events

- **`breaker.fallback(fn)`** returns the breaker.
  - **When it's used:** after a failure, a timeout, or an `OpenCircuitError` rejection. <!-- tests: fallback answers failures, timeouts and rejections -->
  - **What happens:** `fire()` resolves with `fn(error, ...args)` instead of rejecting. <!-- tests: fallback answers failures, timeouts and rejections -->
- **`breaker.on(event, listener)`** returns a function that unsubscribes. The events are: <!-- tests: events in order, and unsubscribing -->

  | Event | Payload |
  |---|---|
  | `success` | the result |
  | `failure` | the error |
  | `timeout` | the `TimeoutError`, emitted just before `failure` |
  | `reject` | the `OpenCircuitError` |
  | `fallback` | the fallback's value |
  | `open`, `halfOpen`, `close` | none |

  `success` and `failure` come before any state change that they cause. <!-- tests: events in order, and unsubscribing -->
- **`errorFilter(error)`** marks errors that aren't the service's fault, such as a 400 from bad input. When it returns `true`:
  - The caller still gets the error.
  - It counts as a **success** for the breaker. <!-- tests: errorFilter: excluded errors reject but count as a success -->
  - It emits no `failure` event and doesn't use the fallback. <!-- tests: errorFilter: excluded errors reject but count as a success -->

Everything from earlier stages still applies.
