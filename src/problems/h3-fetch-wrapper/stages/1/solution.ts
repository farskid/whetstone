import type { HeadersOption, Options, ResponsePromise, Api } from './types';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head';

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

function mergeOptions(a: Options, b: Options): Options {
  const out: Options = { ...a };
  for (const [k, v] of Object.entries(b)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  out.headers = mergeHeaders(a.headers, b.headers);
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

/** One call to the fetch you passed in (or the global one). */
function attempt(request: Request, o: Options): Promise<Response> {
  const doFetch = o.fetch ?? ((r: Request) => fetch(r));
  try {
    return Promise.resolve(doFetch(request));
  } catch (e) {
    return Promise.reject(e);
  }
}

async function send(method: Method, input: string, o: Options): Promise<Response> {
  const headers = new Headers(o.headers as HeadersInit);
  let body = o.body ?? null;
  if (o.json !== undefined) {
    body = JSON.stringify(o.json);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  const request = new Request(buildUrl(input, o), { method: method.toUpperCase(), headers, body });
  const response = await attempt(request, o);
  if (response.ok) return response;
  throw new HTTPError(response, request);
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
  };
}
