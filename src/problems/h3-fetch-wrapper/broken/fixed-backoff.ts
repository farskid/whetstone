// Bug: Always waits 300 ms between attempts.
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

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

const DEFAULT_RETRY: Required<RetryOptions> = {
  limit: 2,
  methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
  statusCodes: [408, 413, 429, 500, 502, 503, 504],
  maxRetryAfter: Infinity,
};

function headerEntries(h: HeadersOption | undefined): [string, string | undefined][] {
  if (!h) return [];
  if (h instanceof Headers) return [...h.entries()];
  if (Array.isArray(h)) return h.map(([k, v]) => [k, v] as [string, string]);
  return Object.entries(h);
}

function mergeHeaders(a: HeadersOption | undefined, b: HeadersOption | undefined): Headers {
  const out = new Headers();
  for (const [k, v] of [...headerEntries(a), ...headerEntries(b)]) {
    if (v === undefined) out.delete(k);
    else out.set(k, v);
  }
  return out;
}

function toRetry(r: number | RetryOptions | undefined): RetryOptions {
  return typeof r === 'number' ? { limit: r } : r ?? {};
}

function mergeOptions(a: Options, b: Options): Options {
  const out: Options = { ...a };
  for (const [k, v] of Object.entries(b)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  out.headers = mergeHeaders(a.headers, b.headers);
  out.retry = { ...toRetry(a.retry), ...toRetry(b.retry) };
  const hooks: Hooks = {};
  for (const name of ['beforeRequest', 'afterResponse', 'beforeError'] as const) {
    (hooks as Record<string, unknown[]>)[name] = [...(a.hooks?.[name] ?? []), ...(b.hooks?.[name] ?? [])];
  }
  out.hooks = hooks;
  return out;
}

function buildUrl(input: string, o: Options): string {
  const raw = o.prefixUrl ? `${o.prefixUrl.replace(/\/+$/, '')}/${input.replace(/^\/+/, '')}` : input;
  if (o.searchParams === undefined) return raw;
  const url = new URL(raw);
  const sp = o.searchParams;
  const pairs: [string, string][] =
    typeof sp === 'string' ? [...new URLSearchParams(sp)]
    : sp instanceof URLSearchParams ? [...sp]
    : Object.entries(sp).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]);
  for (const [k, v] of pairs) url.searchParams.append(k, v);
  return url.toString();
}

/** ms to wait for a Retry-After header value, or undefined if it can't be read. */
function retryAfterMs(value: string | null, clock: Clock): number | undefined {
  if (value === null) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const at = Date.parse(v);
  return Number.isNaN(at) ? undefined : Math.max(0, at - clock.now());
}

function sleep(ms: number, clock: Clock, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const onAbort = () => { clock.clearTimeout(id); reject(signal!.reason); };
    const id = clock.setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** One fetch with the timeout and the caller's signal wired in. */
function attempt(request: Request, o: Options, clock: Clock): Promise<Response> {
  const controller = new AbortController();
  const signal = o.signal;
  return new Promise<Response>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    let timer: unknown = null;
    const done = () => {
      if (timer !== null) clock.clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => { done(); controller.abort(signal!.reason); reject(signal!.reason); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (o.timeout !== false) {
      timer = clock.setTimeout(() => {
        timer = null;
        done();
        const err = new TimeoutError(request);
        controller.abort(err);
        reject(err);
      }, o.timeout ?? 10000);
    }
    const doFetch = o.fetch ?? ((r: Request) => fetch(r));
    let p: Promise<Response>;
    try {
      p = Promise.resolve(doFetch(new Request(request, { signal: controller.signal })));
    } catch (e) {
      p = Promise.reject(e);
    }
    p.then((r) => { done(); resolve(r); }, (e) => { done(); reject(e); });
  });
}

async function send(method: Method, input: string, o: Options): Promise<Response> {
  const clock = o.clock ?? realClock;
  const retry = { ...DEFAULT_RETRY, ...toRetry(o.retry) };
  const headers = new Headers(o.headers as HeadersInit);
  let body = o.body ?? null;
  if (o.json !== undefined) {
    body = JSON.stringify(o.json);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  let request = new Request(buildUrl(input, o), { method: method.toUpperCase(), headers, body });
  let shortCircuit: Response | undefined;
  for (const hook of o.hooks?.beforeRequest ?? []) {
    const r = await hook(request);
    if (r instanceof Response) { shortCircuit = r; break; }
    if (r instanceof Request) request = r;
  }
  const canRetry = retry.methods.includes(request.method.toLowerCase());
  for (let n = 0; ; n++) {
    let response: Response;
    if (shortCircuit) response = shortCircuit;
    else {
      try {
        response = await attempt(request.clone(), o, clock);
      } catch (e) {
        const stop = e instanceof TimeoutError || o.signal?.aborted || !canRetry || n >= retry.limit;
        if (stop) throw e;
        await sleep(300 * 2 ** n, clock, o.signal);
        continue;
      }
    }
    for (const hook of o.hooks?.afterResponse ?? []) {
      const r = await hook(request, response);
      if (r instanceof Response) response = r;
    }
    if (response.ok) return response;
    if (!shortCircuit && canRetry && n < retry.limit && retry.statusCodes.includes(response.status)) {
      const after = retryAfterMs(response.headers.get('retry-after'), clock);
      if (after === undefined || after <= retry.maxRetryAfter) {
        await sleep(after ?? 300, clock, o.signal);
        continue;
      }
    }
    let error = new HTTPError(response, request);
    for (const hook of o.hooks?.beforeError ?? []) error = await hook(error);
    throw error;
  }
}

function responsePromise(p: Promise<Response>): ResponsePromise {
  const rp = p as ResponsePromise;
  rp.text = () => p.then((r) => r.text());
  rp.json = <T>() => p.then(async (r) => {
    if (r.status === 204) return undefined as T;
    const text = await r.text();
    return (text === '' ? undefined : JSON.parse(text)) as T;
  });
  return rp;
}

export function createApi(defaults: Options = {}): Api {
  const call = (method: Method) => (url: string, options: Options = {}) => responsePromise(send(method, url, mergeOptions(defaults, options)));
  return {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    patch: call('patch'),
    delete: call('delete'),
    head: call('head'),
    extend: (options) => createApi(mergeOptions(defaults, options)),
  };
}
