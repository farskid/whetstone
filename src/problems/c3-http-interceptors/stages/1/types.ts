/** One request. `method` defaults to 'GET'. */
export interface RequestConfig {
  /** Relative (joined onto baseURL) or absolute (http:// or https://). */
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface Response<T = unknown> {
  status: number;
  data: T;
  /** `{}` when the adapter gives none. */
  headers: Record<string, string>;
  /** The config as the chain saw it, with the un-joined url. */
  config: RequestConfig;
}

/** Does the actual I/O. Receives the config with baseURL joined onto the url. */
export type Adapter = (config: RequestConfig) => Promise<{ status: number; data?: unknown; headers?: Record<string, string> }>;

export interface Client {
  request<T = unknown>(config: RequestConfig): Promise<Response<T>>;
  /** request() with method 'GET'. */
  get<T = unknown>(url: string, config?: Partial<RequestConfig>): Promise<Response<T>>;
  /** request() with method 'POST' and this body. */
  post<T = unknown>(url: string, body: unknown, config?: Partial<RequestConfig>): Promise<Response<T>>;
}
