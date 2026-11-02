# Fetch wrapper: hooks

Add **hooks**: small functions that can change a request, replace a response, or reword an error.

```ts
const api = createApi({
  fetch,
  hooks: { beforeRequest: [(req) => { req.headers.set('authorization', 'Bearer t1'); }] },
});
```

## Hooks

`hooks` holds arrays of functions that run in order.

- **`beforeRequest(request)`** runs once, before the first attempt.
  - **Return a `Request`** to use it instead.
  - **Return a `Response`** to skip `fetch` entirely. That response is still checked for errors, but it is never retried.
- **`afterResponse(request, response)`** runs after every attempt. Return a `Response` to replace the one you got. A typical use is refreshing a token after a 401.
- **`beforeError(error)`** runs on an `HTTPError` before it is thrown. It returns the error to throw.

Options merge as before, except that each **hooks** list is added after the default list instead of replacing it.

Everything from earlier stages still applies.
