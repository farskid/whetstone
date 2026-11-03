Use the interceptors to add auth: send a bearer token, and when the server says `401`, refresh the token and retry.

```ts
const uninstall = installAuthRefresh(api, { getToken: () => store.token, refresh: refreshToken });

interface RequestConfig { /* ...stage 2, plus: */ retried?: boolean }

interface AuthRefreshOptions {
  getToken(): string | null;
  refresh(): Promise<string>;   // obtains and stores a new token (getToken() returns it afterwards)
}

function installAuthRefresh(client: Client, options: AuthRefreshOptions): () => void;   // returns uninstall
```

- It adds a request interceptor that sets `headers.Authorization = 'Bearer <token>'` whenever `getToken()` isn't `null`. With `null` the headers are left alone. <!-- tests: auth: adds the bearer token (and nothing when there is none) -->
- It adds a response interceptor that handles a `401` `HttpError`:
  - If the request was already retried (`config.retried`), reject with that error. Never loop. <!-- tests: auth: never loops; a 401 after the retry rejects -->
  - Otherwise await `refresh()`, then retry with `client.request({ ...config, retried: true })`. The retry goes through the interceptors again, so it picks up the new token. Its result (or error) becomes the original request's. <!-- tests: auth: a 401 refreshes and retries once with the new token -->
  - If `refresh()` rejects, the request rejects with the refresh error.
- Any other error (other statuses, network errors) passes through untouched. <!-- tests: auth: non-401 errors pass through; uninstall removes both interceptors -->
- The returned function removes both interceptors. <!-- tests: auth: non-401 errors pass through; uninstall removes both interceptors -->
