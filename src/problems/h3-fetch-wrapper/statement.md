# Fetch wrapper

**ky** and **ofetch** wrap `fetch` with the parts everyone ends up rewriting: base URLs, throwing on HTTP errors, retries, hooks and timeouts. Build `createApi(options)` with the same core. It uses the real `Request`, `Response` and `Headers` classes, but calls the `fetch` you pass in.

## Requests

`createApi(defaults)` returns an object with `get`, `post`, `put`, `patch`, `delete` and `head`. Each one takes `(url, options?)`, and those options are merged over the defaults.

- **`prefixUrl`** goes in front of the URL, with exactly one `/` between them, no matter which side has slashes.
- **`searchParams`** can be a string (a leading `?` is allowed), a `URLSearchParams`, or an object. They are **appended** to any query already in the URL. Object entries whose value is `undefined` are skipped, and other values are turned into strings.
- **`json`** sends `JSON.stringify(json)` as the body. It sets `content-type: application/json` unless you set a content type yourself. **`body`** sends a raw body.
- **Return value.** Each method returns a promise of the `Response`. It also has:
  - **`.json()`**: the parsed body, or `undefined` for a 204 or an empty body.
  - **`.text()`**: the body as text.
- **Errors.** A response that isn't 2xx rejects with an **`HTTPError`** that carries `response` and `request`.

## Retries

`retry` is a number (the limit) or `{ limit, methods, statusCodes, maxRetryAfter }`.

- **What's retried.**
  - **Methods:** by default `get`, `put`, `head`, `delete`, `options` and `trace`. POST and PATCH are not retried unless you list them.
  - **Statuses:** 408, 413, 429, 500, 502, 503 and 504.
  - **Network errors:** when `fetch` itself rejects.
- **How many times.** Up to `limit` retries after the first attempt (default 2).
- **How long to wait.** 300 ms before the first retry, 600 ms before the second, doubling each time.
- **`Retry-After`.** If the response has this header, wait that long instead. It can be in seconds or an HTTP date, measured from `clock.now()`. If it asks for more than `maxRetryAfter` ms (default `Infinity`), give up and throw the `HTTPError` right away.
- **Body.** Every attempt sends the full body again.

## Hooks

`hooks` holds arrays of functions that run in order.

- **`beforeRequest(request)`** runs once, before the first attempt.
  - **Return a `Request`** to use it instead.
  - **Return a `Response`** to skip `fetch` entirely. That response is still checked for errors, but it is never retried.
- **`afterResponse(request, response)`** runs after every attempt. Return a `Response` to replace the one you got. A typical use is refreshing a token after a 401.
- **`beforeError(error)`** runs on an `HTTPError` before it is thrown. It returns the error to throw.

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

```ts
const api = createApi({ prefixUrl: 'https://api.example.com/v1', fetch });
const user = await api.get('users/42', { searchParams: { expand: 'teams' } }).json();
```
