Use the interceptors to add auth: send a bearer token, and when the server says `401`, refresh the token and retry.

```ts
const uninstall = installAuthRefresh(api, { getToken: () => store.token, refresh: refreshToken });

interface RequestConfig { /* ...stage 2, plus: */ retried?: boolean }

function installAuthRefresh(client, options: {
  getToken(): string | null;
  refresh(): Promise<string>;   // obtains and stores a new token (getToken() returns it afterwards)
}): () => void;                  // uninstall
```

- It adds a request interceptor that sets `headers.Authorization = 'Bearer <token>'` whenever `getToken()` isn't `null`. With `null` the headers are left alone.
- It adds a response interceptor that handles a `401` `HttpError`:
  - If the request was already retried (`config.retried`), reject with that error. Never loop.
  - Otherwise await `refresh()`, then retry with `client.request({ ...config, retried: true })`. The retry goes through the interceptors again, so it picks up the new token. Its result (or error) becomes the original request's.
  - If `refresh()` rejects, the request rejects with the refresh error.
- Any other error (other statuses, network errors) passes through untouched.
- The returned function removes both interceptors.
