/** Injected time in ms. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): number;
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

/** What beforeError hooks receive and return: the HTTPError (or anything shaped like it). */
export interface HTTPErrorLike extends Error {
  readonly response: Response;
  readonly request: Request;
}

/** Each list runs in order. */
export interface Hooks {
  beforeRequest?: ((request: Request) => Request | Response | void | Promise<Request | Response | void>)[];
  afterResponse?: ((request: Request, response: Response) => Response | void | Promise<Response | void>)[];
  beforeError?: ((error: HTTPErrorLike) => HTTPErrorLike | Promise<HTTPErrorLike>)[];
}

/** Per-call options are merged over the client's defaults. */
export interface Options {
  /** The fetch to call (default: the global fetch). */
  fetch?: (request: Request) => Promise<Response>;
  prefixUrl?: string;
  searchParams?: SearchParams;
  headers?: HeadersOption;
  json?: unknown;
  body?: BodyInit | null;
  retry?: number | RetryOptions;
  hooks?: Hooks;
  clock?: Clock;
}

/** The response promise, with body shortcuts. */
export interface ResponsePromise extends Promise<Response> {
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

export interface Api {
  get(url: string, options?: Options): ResponsePromise;
  post(url: string, options?: Options): ResponsePromise;
  put(url: string, options?: Options): ResponsePromise;
  patch(url: string, options?: Options): ResponsePromise;
  delete(url: string, options?: Options): ResponsePromise;
  head(url: string, options?: Options): ResponsePromise;
}
