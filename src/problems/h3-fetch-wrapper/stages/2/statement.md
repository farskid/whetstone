# Fetch wrapper: retries

Networks fail and servers get overloaded. Add **retries** for requests that are safe to send twice.

```ts
const api = createApi({ fetch, clock, retry: { limit: 3 } });
await api.get('https://a.test/x'); // 503, wait 300 ms, 503, wait 600 ms, 200
```

Waiting uses an injected `clock` with `now()` and `setTimeout(fn, ms)`, in ms. It defaults to the real one.

## Retries

`retry` is a number (the limit) or `{ limit, methods, statusCodes, maxRetryAfter }`.

- **What's retried.**
  - **Methods:** by default `get`, `put`, `head`, `delete`, `options` and `trace`. POST and PATCH are not retried unless you list them. <!-- tests: POST and 4xx are not retried unless configured -->
  - **Statuses:** 408, 413, 429, 500, 502, 503 and 504.
  - **Network errors:** when `fetch` itself rejects. <!-- tests: network errors are retried for idempotent methods -->
- **How many times.** Up to `limit` retries after the first attempt (default 2).
- **How long to wait.** 300 ms before the first retry, 600 ms before the second, doubling each time. <!-- tests: idempotent requests retry 5xx with backoff, up to the limit -->
- **`Retry-After`.** If the response has this header, wait that long instead. It can be in seconds or an HTTP date, measured from `clock.now()`. If it asks for more than `maxRetryAfter` ms (default `Infinity`), give up and throw the `HTTPError` right away. <!-- tests: Retry-After in seconds or as an HTTP date, and maxRetryAfter -->
- **Body.** Every attempt sends the full body again.

Everything from earlier stages still applies.
