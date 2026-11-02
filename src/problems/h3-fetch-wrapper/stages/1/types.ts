export type SearchParams = string | URLSearchParams | Record<string, string | number | boolean | undefined>;

/** Header values of undefined remove that header when options are merged. */
export type HeadersOption = HeadersInit | Record<string, string | undefined>;

/** Per-call options are merged over the client's defaults. */
export interface Options {
  /** The fetch to call (default: the global fetch). */
  fetch?: (request: Request) => Promise<Response>;
  prefixUrl?: string;
  searchParams?: SearchParams;
  headers?: HeadersOption;
  json?: unknown;
  body?: BodyInit | null;
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
