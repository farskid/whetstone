import type { RequestConfig, Response, Adapter, Client, ClientOptions } from './types';

export class HttpError extends Error {
  constructor(public response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = 'HttpError';
  }
  get status() { return this.response.status; }
  get config() { return this.response.config; }
}

const isAbsolute = (url: string) => /^https?:\/\//i.test(url);
const joinURL = (base: string | undefined, url: string) =>
  !base || isAbsolute(url) ? url : `${base.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;

export function createClient(options: ClientOptions): Client {
  const { adapter, baseURL } = options;

  const dispatch = async (config: RequestConfig): Promise<Response> => {
    const raw = await adapter({ ...config, url: joinURL(baseURL, config.url) });
    const response: Response = { status: raw.status, data: raw.data, headers: raw.headers ?? {}, config };
    if (raw.status < 200 || raw.status > 299) throw new HttpError(response);
    return response;
  };

  const client: Client = {
    request<T>(config: RequestConfig) {
      const copy: RequestConfig = { method: 'GET', ...config, headers: { ...config.headers } };
      return dispatch(copy) as Promise<Response<T>>;
    },
    get(url, config = {}) {
      return client.request({ ...config, url, method: 'GET' });
    },
    post(url, body, config = {}) {
      return client.request({ ...config, url, method: 'POST', body });
    },
  };
  return client;
}
