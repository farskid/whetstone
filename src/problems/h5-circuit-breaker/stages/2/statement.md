# Circuit breaker: half-open

An open breaker should try the service again after a while. Add the **half-open** state: after `resetTimeout`, a few trial calls decide whether to close or reopen.

```ts
const b = new CircuitBreaker(fn, { clock, failureThreshold: 1, resetTimeout: 5000 });
await b.fire('fail').catch(() => {}); // open
// 5 s later
b.state;           // 'halfOpen'
await b.fire('ok'); // the trial succeeds
b.state;           // 'closed'
```

`breaker.state` can now also be `'halfOpen'`. The breaker uses the injected `clock` (`now()` and `setTimeout(fn, ms)`) for its timers. It defaults to the real one.

## Half-open

- **When.** `resetTimeout` ms after opening (default 30000, timed with the injected `clock`), the breaker becomes **half-open**.
- **Trials.** While half-open, up to `halfOpenMax` calls (default 1) are let through at once as trials. Any more are rejected with `OpenCircuitError`.
- **The first trial decides.**
  - If it succeeds, the breaker **closes** with all counts reset.
  - If it fails, the breaker **opens** again for another full `resetTimeout`.
- **Results that arrive too late.** A call that was started before the breaker last changed state, and finishes after that change, doesn't affect the breaker. Its caller still gets its result or error.

Everything from earlier stages still applies.
