# Fetch wrapper: requests

**ky** and **ofetch** wrap `fetch` with the parts everyone ends up rewriting: base URLs, throwing on HTTP errors, retries, hooks and timeouts. Start with the basics: `createApi(options)` builds URLs, sends bodies, reads responses and throws on HTTP errors. It uses the real `Request`, `Response` and `Headers` classes, but calls the `fetch` you pass in (default: the global `fetch`).

```ts
const api = createApi({ prefixUrl: 'https://api.example.com/v1', fetch });
const user = await api.get('users/42', { searchParams: { expand: 'teams' } }).json();
// GET https://api.example.com/v1/users/42?expand=teams
```

## Requests

`createApi(defaults)` returns an object with `get`, `post`, `put`, `patch`, `delete` and `head`. Each one takes `(url, options?)`, and those options are merged over the defaults: **headers** merge by name, ignoring case, and a header set to `undefined` is removed; every other option given replaces the default.

- **`prefixUrl`** goes in front of the URL, with exactly one `/` between them, no matter which side has slashes. <!-- tests: prefixUrl, searchParams and .json() -->
- **`searchParams`** can be a string (a leading `?` is allowed), a `URLSearchParams`, or an object. They are **appended** to any query already in the URL. Object entries whose value is `undefined` are skipped, and other values are turned into strings. <!-- tests: prefixUrl, searchParams and .json() -->
- **`json`** sends `JSON.stringify(json)` as the body. It sets `content-type: application/json` unless you set a content type yourself. **`body`** sends a raw body. <!-- tests: json bodies, .text(), and empty bodies -->
- **Return value.** Each method returns a promise of the `Response`. It also has:
  - **`.json()`**: the parsed body, or `undefined` for a 204 or an empty body. <!-- tests: json bodies, .text(), and empty bodies -->
  - **`.text()`**: the body as text. <!-- tests: json bodies, .text(), and empty bodies -->
- **Errors.** A response that isn't 2xx rejects with an **`HTTPError`** that carries `response` and `request`. <!-- tests: a non-2xx response throws HTTPError with the response attached -->
