Build a small **axios**-style HTTP client. It doesn't do I/O itself: an injected *adapter* sends the request, and the client turns the result into a response or an error.

```ts
const api = createClient({ baseURL: 'https://api.example.com/v1', adapter: fetchAdapter });
const res = await api.get('/me');            // adapter gets url 'https://api.example.com/v1/me'
await api.post('/items', { a: 1 });          // method 'POST', body { a: 1 }
```

```ts
interface RequestConfig { url: string; method?: string; headers?: Record<string, string>; body?: unknown }
interface Response<T = unknown> { status: number; data: T; headers: Record<string, string>; config: RequestConfig }
type Adapter = (config: RequestConfig) => Promise<{ status: number; data?: unknown; headers?: Record<string, string> }>;

class HttpError extends Error {        // message: `Request failed with status ${status}`
  status: number; response: Response; config: RequestConfig;
}

interface ClientOptions { adapter: Adapter; baseURL?: string }

function createClient(options: ClientOptions): {
  request<T = unknown>(config: RequestConfig): Promise<Response<T>>;
  get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<Response<T>>;
  post<T = unknown>(url: string, body: unknown, config?: Partial<RequestConfig>): Promise<Response<T>>;
};
```

- `request` works on a copy: `{ method: 'GET', ...config, headers: { ...config.headers } }`. It never mutates the caller's object.
- The adapter gets that copy with `baseURL` joined onto a relative `url`, with exactly one `/` between them (`'https://a/v1/'` + `'/users'` and `'users'` both give `'https://a/v1/users'`). An absolute `url` (`http://` or `https://`) is passed through unchanged, and so is any url when there is no `baseURL`. <!-- tests: baseURL joining -->
- The response is `{ status, data, headers, config }`, where `config` is the copy with the **un-joined** url. Missing `data` stays `undefined`; missing `headers` becomes `{}`. <!-- tests: request() calls the adapter and builds the response -->
- A status outside 200–299 rejects with an `HttpError` for that response. `status` and `config` are the response's. <!-- tests: non-2xx rejects with HttpError; adapter errors pass through -->
- An adapter error (for example a network failure) rejects with that same error. <!-- tests: non-2xx rejects with HttpError; adapter errors pass through -->
- `get(url, config)` and `post(url, body, config)` are shortcuts for `request({ ...config, url, method })`, with `body` for `post`.
