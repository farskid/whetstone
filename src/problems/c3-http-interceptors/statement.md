# HTTP interceptors + token refresh

Build a small **axios**-style HTTP client with interceptors. Then use it to solve a classic production bug: when an access token expires, *ten* parallel requests get `401`, and the app fires *ten* refresh calls.

```ts
const api = createClient({ baseURL: 'https://api.example.com', adapter: fetchAdapter });
api.interceptors.request.use((config) => ({ ...config, headers: { ...config.headers, 'X-Trace': id() } }));
installAuthRefresh(api, { getToken: () => store.token, refresh: refreshToken });

await Promise.all([api.get('/me'), api.get('/orders'), api.get('/cart')]); // token expired → ONE refresh
```

## API

```ts
interface RequestConfig { url: string; method?: string; headers?: Record<string, string>; body?: unknown; retried?: boolean }
interface Response<T = unknown> { status: number; data: T; headers: Record<string, string>; config: RequestConfig }
type Adapter = (config: RequestConfig) => Promise<{ status: number; data?: unknown; headers?: Record<string, string> }>;

class HttpError extends Error {        // message: `Request failed with status ${status}`
  status: number; response: Response; config: RequestConfig;
}

interface InterceptorManager<V> {
  use(onFulfilled?: (v: V) => V | Promise<V>, onRejected?: (err: unknown) => unknown): number;
  eject(id: number): void;
}

interface ClientOptions { adapter: Adapter; baseURL?: string }

function createClient(options: ClientOptions): {
  request<T = unknown>(config: RequestConfig): Promise<Response<T>>;
  get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<Response<T>>;
  post<T = unknown>(url: string, body: unknown, config?: Partial<RequestConfig>): Promise<Response<T>>;
  interceptors: { request: InterceptorManager<RequestConfig>; response: InterceptorManager<Response> };
};

interface AuthRefreshOptions {
  getToken(): string | null;
  refresh(): Promise<string>;   // obtains and stores a new token (getToken() returns it afterwards)
}

function installAuthRefresh(client: Client, options: AuthRefreshOptions): () => void;   // returns uninstall
```

## Client rules

**`request`**
- Copy the config first: `{ method: 'GET', ...config, headers: { ...config.headers } }`. The caller's object is never mutated.
- Then run the chain: **request interceptors in reverse registration order** (last added runs first, like axios), then the adapter, then **response interceptors in registration order**.

**The chain** works like `promise.then(onFulfilled, onRejected)` applied step by step:
- A step's `onFulfilled` gets the previous value and may return a new one, sync or async.
- A thrown or rejected error skips the following `onFulfilled` handlers and goes to the next `onRejected`. That includes skipping the adapter.
- An `onRejected` that returns a value **recovers** the chain.

**Adapter step**
- The adapter gets the config with `baseURL` joined onto a relative `url`, with exactly one `/` between them. An absolute `url` (`http://` or `https://`) is passed through unchanged.
- The **un-joined** config is what goes into `response.config` and `HttpError.config`.
- A status outside 200–299 rejects with an `HttpError`.
- An adapter error (for example a network failure) rejects with that same error.

**`eject(id)`** removes an interceptor. It doesn't affect requests that are already in flight. A missing `data` or `headers` from the adapter becomes `undefined` or `{}`.

**`get` / `post`** are shortcuts for `request` with `method: 'GET'` / `'POST'` (and `body`).

## `installAuthRefresh` rules

**Sending requests**
- It adds a request interceptor that sets `headers.Authorization = 'Bearer <token>'` whenever `getToken()` isn't `null`.
- If a refresh is in progress, the interceptor **waits for it first**, so a new request never goes out with a token that is known to be expired.

**Handling a `401`.** It adds a response interceptor that handles a `401` `HttpError`:
- If the request was already retried (`config.retried`), reject with that error. Never loop.
- If the request went out with a token that is no longer current, someone else already refreshed. Just retry.
- Otherwise call `refresh()`. Only **one refresh can be in flight**: every 401 that arrives while it runs waits for the same refresh. A later 401 after it finished may start a new one.
- Retry with `client.request({ ...config, retried: true })`. The retry goes through the interceptors again, so it picks up the new token.
- If the refresh fails, every request waiting on it rejects with the refresh error.

**Other errors** pass through untouched.

**Uninstall.** The returned function removes both interceptors.
