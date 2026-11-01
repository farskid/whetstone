export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export type SearchParams = string | URLSearchParams | Record<string, string | number | boolean | undefined>;
/** Header values of undefined remove that header when options are merged. */
export type HeadersOption = HeadersInit | Record<string, string | undefined>;

export interface RetryOptions {
  /** Retries after the first attempt (default 2). */
  limit?: number;
  /** Lower-case methods that may be retried (default get, put, head, delete, options, trace). */
  methods?: string[];
  /** Statuses that are retried (default 408, 413, 429, 500, 502, 503, 504). */
  statusCodes?: number[];
  /** Give up instead of waiting longer than this for a Retry-After (default Infinity). */
  maxRetryAfter?: number;
}

export interface Hooks {
  beforeRequest?: ((request: Request) => Request | Response | void | Promise<Request | Response | void>)[];
  afterResponse?: ((request: Request, response: Response) => Response | void | Promise<Response | void>)[];
  beforeError?: ((error: HTTPError) => HTTPError | Promise<HTTPError>)[];
}

export interface Options {
  fetch?: (request: Request) => Promise<Response>;
  prefixUrl?: string;
  searchParams?: SearchParams;
  headers?: HeadersOption;
  json?: unknown;
  body?: BodyInit | null;
  retry?: number | RetryOptions;
  /** ms per attempt (default 10000); false turns it off. */
  timeout?: number | false;
  signal?: AbortSignal;
  hooks?: Hooks;
  clock?: Clock;
}

export interface ResponsePromise extends Promise<Response> {
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';

export interface Api {
  get(url: string, options?: Options): ResponsePromise;
  post(url: string, options?: Options): ResponsePromise;
  put(url: string, options?: Options): ResponsePromise;
  patch(url: string, options?: Options): ResponsePromise;
  delete(url: string, options?: Options): ResponsePromise;
  head(url: string, options?: Options): ResponsePromise;
  extend(options: Options): Api;
}

export class HTTPError extends Error {
  readonly response: Response;
  readonly request: Request;
  constructor(response: Response, request: Request) {
    super(`Request failed with status ${response.status}: ${request.method} ${request.url}`);
    this.name = 'HTTPError';
    this.response = response;
    this.request = request;
  }
}

export class TimeoutError extends Error {
  readonly request: Request;
  constructor(request: Request) {
    super(`Request timed out: ${request.method} ${request.url}`);
    this.name = 'TimeoutError';
    this.request = request;
  }
}

export function createApi(defaults: Options = {}): Api {
  throw new Error('Not implemented');
}
