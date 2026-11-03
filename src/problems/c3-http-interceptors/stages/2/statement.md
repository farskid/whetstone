Add interceptors: handlers that run on every request before the adapter, and on every response after it.

```ts
api.interceptors.request.use((config) => ({ ...config, headers: { ...config.headers, 'X-Trace': id() } }));
const id = api.interceptors.response.use((res) => res, (err) => fallback(err));
api.interceptors.response.eject(id);

interface InterceptorManager<V> {
  use(onFulfilled?: (v: V) => V | Promise<V>, onRejected?: (err: unknown) => unknown): number;
  eject(id: number): void;
}
// the client, plus:
interceptors: { request: InterceptorManager<RequestConfig>; response: InterceptorManager<Response> };
```

**Order.** `request` copies the config (as in stage 1), then runs **request interceptors in reverse registration order** (last added runs first, like axios), then the adapter step, then **response interceptors in registration order**. <!-- tests: request interceptors run last-added-first; response interceptors in order -->

**The chain** works like `promise.then(onFulfilled, onRejected)` applied step by step, starting from the copied config:
- A step's `onFulfilled` gets the previous value and may return a new one, sync or async. A missing `onFulfilled` passes the value on.
- A thrown or rejected error skips the following `onFulfilled` handlers, and the adapter step, and goes to the next `onRejected`. A missing `onRejected` passes the error on. <!-- tests: errors skip fulfilled handlers (and the adapter); onRejected can recover -->
- An `onRejected` that returns a value **recovers** the chain: the next step's `onFulfilled` gets that value. <!-- tests: errors skip fulfilled handlers (and the adapter); onRejected can recover -->
- The adapter step is stage 1's behaviour. Its `HttpError` or adapter error enters the response interceptors as an error. `response.config` is the config that reached the adapter step, un-joined. <!-- tests: HTTP errors reach response onRejected handlers -->
- The caller's config is never mutated, even if an interceptor mutates the value it receives. <!-- tests: the caller's config is never mutated -->

**`use` / `eject`**
- `use` returns an id. `eject(id)` removes that interceptor; an unknown id does nothing. <!-- tests: eject removes an interceptor -->
- Interceptors are read when `request` starts, so adding or ejecting doesn't affect requests already in flight.
