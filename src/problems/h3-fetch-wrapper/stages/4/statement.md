# Fetch wrapper: timeouts and extend

Add **timeouts**, your own **AbortSignal**, and **`api.extend()`** for building one client from another.

```ts
const api = createApi({ fetch, timeout: 1000 });
const admin = api.extend({ headers: { 'x-app': 'admin' } });
await admin.get('https://a.test/slow'); // rejects with TimeoutError after 1 s
```

The `clock` now also needs `clearTimeout(id)`.

## Timeouts and extend

- **`timeout`** is in ms per attempt (default 10000), and `false` turns it off.
  - When time runs out, the `fetch` is aborted through the request's signal, and the call rejects with a **`TimeoutError`**.
  - Timeouts are not retried.
- **`signal`** is your own `AbortSignal`. Aborting it aborts the `fetch` in progress, or cancels the wait before a retry, and the call rejects with `signal.reason` right away.
- **`api.extend(options)`** returns a new client. It doesn't change the old one. The new options are merged over the old ones like this:
  - **Headers** merge by name, ignoring case. A header set to `undefined` is removed.
  - **Hooks** are added after the parent's hooks.
  - **`retry`** objects merge field by field.
  - **Everything else** is replaced.
- **`clock`** (`now`, `setTimeout`, `clearTimeout`) is used for every timer and for `Retry-After` dates.

Everything from earlier stages still applies.
