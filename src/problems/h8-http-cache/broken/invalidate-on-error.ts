// Bug: Invalidates even when the unsafe request failed.
export interface Clock {
  now(): number;
}

/** Header names are lower-case. */
export type Headers = Record<string, string>;

export interface CacheRequest {
  url: string;
  method?: string;
  headers?: Headers;
}

export interface OriginResponse {
  status: number;
  headers: Headers;
  body: string;
}

export type CacheStatus = 'HIT' | 'MISS' | 'REVALIDATED' | 'STALE';

export interface CacheResult extends OriginResponse {
  cache: CacheStatus;
}

export interface CacheOptions {
  fetch: (request: { url: string; method: string; headers: Headers }) => Promise<OriginResponse>;
  clock?: Clock;
  /** A shared (proxy/CDN) cache honors s-maxage and never stores private responses. Default false. */
  shared?: boolean;
}

export interface HttpCache {
  fetch(request: CacheRequest): Promise<CacheResult>;
}

interface Entry {
  status: number;
  headers: Headers;
  body: string;
  requestTime: number;
  responseTime: number;
  varyNames: string[];
  varyValues: string[];
}

const STORABLE = new Set([200, 203, 204, 300, 301, 404, 410]);
const SERVER_ERRORS = new Set([500, 502, 503, 504]);
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function parseCacheControl(value: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of (value ?? '').split(',')) {
    const [rawName, ...rest] = part.split('=');
    const name = rawName.trim().toLowerCase();
    if (!name) continue;
    out.set(name, rest.join('=').trim().replace(/^"(.*)"$/, '$1'));
  }
  return out;
}

const seconds = (v: string | undefined): number | undefined => (v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined);
const parseDate = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : t;
};
const lower = (h: Headers | undefined): Headers => Object.fromEntries(Object.entries(h ?? {}).map(([k, v]) => [k.toLowerCase(), v]));

export function createHttpCache(options: CacheOptions): HttpCache {
  const clock = options.clock ?? Date;
  const shared = options.shared ?? false;
  const store = new Map<string, Entry[]>();
  const background = new Set<Entry>();

  const dateOf = (e: Entry) => parseDate(e.headers.date) ?? e.responseTime;

  /** Freshness lifetime in seconds. */
  const lifetime = (e: Entry): number => {
    const cc = parseCacheControl(e.headers['cache-control']);
    const s = shared ? seconds(cc.get('s-maxage')) : undefined;
    if (s !== undefined) return s;
    const maxAge = seconds(cc.get('max-age'));
    if (maxAge !== undefined) return maxAge;
    if (e.headers.expires !== undefined) {
      const exp = parseDate(e.headers.expires);
      return exp === undefined ? 0 : Math.max(0, (exp - dateOf(e)) / 1000);
    }
    const lm = parseDate(e.headers['last-modified']);
    if (lm !== undefined) return Math.max(0, (dateOf(e) - lm) / 1000) * 0.1;
    return 0;
  };

  /** Current age in seconds (RFC 9111 §4.2.3). */
  const currentAge = (e: Entry): number => {
    const apparentAge = Math.max(0, e.responseTime - dateOf(e)) / 1000;
    const responseDelay = (e.responseTime - e.requestTime) / 1000;
    const correctedAgeValue = (seconds(e.headers.age) ?? 0) + responseDelay;
    const correctedInitialAge = Math.max(apparentAge, correctedAgeValue);
    return correctedInitialAge + (clock.now() - e.responseTime) / 1000;
  };

  const matches = (e: Entry, headers: Headers) => e.varyNames.every((n, i) => (headers[n] ?? '') === e.varyValues[i]);
  const lookup = (url: string, headers: Headers) => store.get(url)?.find((e) => matches(e, headers));

  const save = (url: string, reqHeaders: Headers, res: OriginResponse, requestTime: number, responseTime: number) => {
    const variants = (store.get(url) ?? []).filter((e) => !matches(e, reqHeaders));
    const cc = parseCacheControl(res.headers['cache-control']);
    const vary = (res.headers.vary ?? '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
    const storable = STORABLE.has(res.status) && !cc.has('no-store') && !(shared && cc.has('private')) && !vary.includes('*');
    if (storable) {
      variants.push({
        status: res.status,
        headers: { ...res.headers },
        body: res.body,
        requestTime,
        responseTime,
        varyNames: vary,
        varyValues: vary.map((n) => reqHeaders[n] ?? ''),
      });
    }
    if (variants.length) store.set(url, variants);
    else store.delete(url);
  };

  const fromEntry = (e: Entry, cache: CacheStatus): CacheResult => ({
    status: e.status,
    headers: { ...e.headers, age: String(Math.floor(currentAge(e))) },
    body: e.body,
    cache,
  });

  const send = async (url: string, headers: Headers, entry: Entry | undefined) => {
    const h = { ...headers };
    if (entry?.headers.etag !== undefined) h['if-none-match'] = entry.headers.etag;
    if (entry?.headers['last-modified'] !== undefined) h['if-modified-since'] = entry.headers['last-modified'];
    const requestTime = clock.now();
    const res = await options.fetch({ url, method: 'GET', headers: h });
    return { res: { ...res, headers: lower(res.headers) }, requestTime, responseTime: clock.now() };
  };

  const refresh = (e: Entry, res: OriginResponse, requestTime: number, responseTime: number) => {
    e.headers = { ...e.headers, ...res.headers };
    e.requestTime = requestTime;
    e.responseTime = responseTime;
  };

  /** How far past its lifetime the entry may be served for this directive, or -1 if not allowed. */
  const staleAllowance = (e: Entry, directive: string): number => {
    const cc = parseCacheControl(e.headers['cache-control']);
    if (cc.has('no-cache') || cc.has('must-revalidate')) return -1;
    return seconds(cc.get(directive)) ?? -1;
  };
  const withinStale = (e: Entry, directive: string) => {
    const allowance = staleAllowance(e, directive);
    return allowance >= 0 && currentAge(e) - lifetime(e) <= allowance;
  };

  const revalidateInBackground = (url: string, headers: Headers, e: Entry) => {
    if (background.has(e)) return;
    background.add(e);
    void send(url, headers, e)
      .then(({ res, requestTime, responseTime }) => {
        if (res.status === 304) refresh(e, res, requestTime, responseTime);
        else if (!SERVER_ERRORS.has(res.status)) save(url, headers, res, requestTime, responseTime);
      })
      .catch(() => {})
      .finally(() => background.delete(e));
  };

  return {
    async fetch(request) {
      const url = request.url;
      const method = (request.method ?? 'GET').toUpperCase();
      const headers = lower(request.headers);
      if (method !== 'GET') {
        const res = await options.fetch({ url, method, headers });
        if (UNSAFE.has(method)) store.delete(url);
        return { ...res, cache: 'MISS' };
      }
      const entry = lookup(url, headers);
      if (entry) {
        const cc = parseCacheControl(entry.headers['cache-control']);
        if (!cc.has('no-cache') && currentAge(entry) < lifetime(entry)) return fromEntry(entry, 'HIT');
        if (withinStale(entry, 'stale-while-revalidate')) {
          revalidateInBackground(url, headers, entry);
          return fromEntry(entry, 'STALE');
        }
      }
      let sent;
      try {
        sent = await send(url, headers, entry);
      } catch (err) {
        if (entry && withinStale(entry, 'stale-if-error')) return fromEntry(entry, 'STALE');
        throw err;
      }
      const { res, requestTime, responseTime } = sent;
      if (entry && res.status === 304) {
        refresh(entry, res, requestTime, responseTime);
        return fromEntry(entry, 'REVALIDATED');
      }
      if (entry && SERVER_ERRORS.has(res.status) && withinStale(entry, 'stale-if-error')) return fromEntry(entry, 'STALE');
      save(url, headers, res, requestTime, responseTime);
      return { ...res, cache: 'MISS' };
    },
  };
}
