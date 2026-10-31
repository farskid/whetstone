// Broken: request interceptors run in registration order, and the caller's config is mutated.
export interface RequestConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  retried?: boolean;
}

export interface Response<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
  config: RequestConfig;
}

export type Adapter = (config: RequestConfig) => Promise<{ status: number; data?: unknown; headers?: Record<string, string> }>;

export class HttpError extends Error {
  constructor(public response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = 'HttpError';
  }
  get status() { return this.response.status; }
  get config() { return this.response.config; }
}

export interface InterceptorManager<V> {
  use(onFulfilled?: (v: V) => V | Promise<V>, onRejected?: (err: unknown) => unknown): number;
  eject(id: number): void;
}

export interface Client {
  request<T = unknown>(config: RequestConfig): Promise<Response<T>>;
  get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<Response<T>>;
  post<T = unknown>(url: string, body: unknown, config?: Partial<RequestConfig>): Promise<Response<T>>;
  interceptors: { request: InterceptorManager<RequestConfig>; response: InterceptorManager<Response> };
}

type Handler = { onFulfilled?: (v: any) => any; onRejected?: (err: unknown) => unknown };

function createManager<V>() {
  const handlers = new Map<number, Handler>();
  let nextId = 0;
  const manager: InterceptorManager<V> & { snapshot(): Handler[] } = {
    use(onFulfilled, onRejected) {
      const id = nextId++;
      handlers.set(id, { onFulfilled, onRejected });
      return id;
    },
    eject(id) { handlers.delete(id); },
    snapshot: () => [...handlers.values()],
  };
  return manager;
}

const isAbsolute = (url: string) => /^https?:\/\//i.test(url);
const joinURL = (base: string | undefined, url: string) =>
  !base || isAbsolute(url) ? url : `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

export function createClient(options: { adapter: Adapter; baseURL?: string }): Client {
  const { adapter, baseURL } = options;
  const requestManager = createManager<RequestConfig>();
  const responseManager = createManager<Response>();

  const dispatch = async (config: RequestConfig): Promise<Response> => {
    const raw = await adapter({ ...config, url: joinURL(baseURL, config.url) });
    const response: Response = { status: raw.status, data: raw.data, headers: raw.headers ?? {}, config };
    if (raw.status < 200 || raw.status > 299) throw new HttpError(response);
    return response;
  };

  const client: Client = {
    request<T>(config: RequestConfig) {
      const copy: RequestConfig = config;
      copy.method ??= 'GET';
      copy.headers ??= {};
      let chain: Promise<any> = Promise.resolve(copy);
      for (const h of requestManager.snapshot()) chain = chain.then(h.onFulfilled, h.onRejected);
      chain = chain.then(dispatch);
      for (const h of responseManager.snapshot()) chain = chain.then(h.onFulfilled, h.onRejected);
      return chain as Promise<Response<T>>;
    },
    get(url, config = {}) {
      return client.request({ ...config, url, method: 'GET' });
    },
    post(url, body, config = {}) {
      return client.request({ ...config, url, method: 'POST', body });
    },
    interceptors: { request: requestManager, response: responseManager },
  };
  return client;
}

export function installAuthRefresh(
  client: Client,
  options: { getToken(): string | null; refresh(): Promise<string> },
): () => void {
  const { getToken, refresh } = options;
  let refreshing: Promise<unknown> | null = null;

  const startRefresh = () => {
    if (!refreshing) {
      refreshing = Promise.resolve()
        .then(() => refresh())
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  };

  const reqId = client.interceptors.request.use(async (config) => {
    if (refreshing) await refreshing.catch(() => {});
    const token = getToken();
    if (token !== null) config = { ...config, headers: { ...config.headers, Authorization: `Bearer ${token}` } };
    return config;
  });

  const resId = client.interceptors.response.use(undefined, async (err) => {
    if (!(err instanceof HttpError) || err.status !== 401 || err.config.retried) throw err;
    const current = getToken();
    const sentWith = err.config.headers?.Authorization;
    const alreadyRefreshed = current !== null && sentWith !== `Bearer ${current}`;
    if (!alreadyRefreshed) await startRefresh();
    return client.request({ ...err.config, retried: true });
  });

  return () => {
    client.interceptors.request.eject(reqId);
    client.interceptors.response.eject(resId);
  };
}
