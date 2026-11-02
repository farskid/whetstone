import type { Headers, OriginResponse, CacheStatus, CacheResult, CacheOptions, HttpCache } from './types';

interface Entry {
  status: number;
  headers: Headers;
  body: string;
  requestTime: number;
  responseTime: number;
}

const STORABLE = new Set([200, 203, 204, 300, 301, 404, 410]);
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
  const store = new Map<string, Entry>();

  const dateOf = (e: Entry) => parseDate(e.headers.date) ?? e.responseTime;

  /** Freshness lifetime in seconds. */
  const lifetime = (e: Entry): number => {
    const cc = parseCacheControl(e.headers['cache-control']);
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


  const save = (url: string, res: OriginResponse, requestTime: number, responseTime: number) => {
    if (!STORABLE.has(res.status)) {
      store.delete(url);
      return;
    }
    store.set(url, { status: res.status, headers: { ...res.headers }, body: res.body, requestTime, responseTime });
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

  return {
    async fetch(request) {
      const url = request.url;
      const method = (request.method ?? 'GET').toUpperCase();
      const headers = lower(request.headers);
      if (method !== 'GET') {
        const res = await options.fetch({ url, method, headers });
        if (UNSAFE.has(method) && res.status < 400) store.delete(url);
        return { ...res, cache: 'MISS' };
      }
      const entry = store.get(url);
      if (entry) {
        const cc = parseCacheControl(entry.headers['cache-control']);
        if (!cc.has('no-cache') && currentAge(entry) < lifetime(entry)) return fromEntry(entry, 'HIT');
      }
      const { res, requestTime, responseTime } = await send(url, headers, entry);
      if (entry && res.status === 304) {
        refresh(entry, res, requestTime, responseTime);
        return fromEntry(entry, 'REVALIDATED');
      }
      save(url, res, requestTime, responseTime);
      return { ...res, cache: 'MISS' };
    },
  };
}
