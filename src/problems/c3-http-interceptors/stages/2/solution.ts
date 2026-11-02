import type { RequestConfig, Response, Adapter, InterceptorManager, Client } from './types';

export class HttpError extends Error {
  constructor(public response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = 'HttpError';
  }
  get status() { return this.response.status; }
  get config() { return this.response.config; }
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
      const copy: RequestConfig = { method: 'GET', ...config, headers: { ...config.headers } };
      let chain: Promise<any> = Promise.resolve(copy);
      for (const h of requestManager.snapshot().reverse()) chain = chain.then(h.onFulfilled, h.onRejected);
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
