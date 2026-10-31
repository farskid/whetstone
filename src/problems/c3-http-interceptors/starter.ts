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

export function createClient(options: { adapter: Adapter; baseURL?: string }): Client {
  throw new Error('Not implemented');
}

export function installAuthRefresh(
  client: Client,
  options: { getToken(): string | null; refresh(): Promise<string> },
): () => void {
  throw new Error('Not implemented');
}
