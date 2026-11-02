/** Time source; `now()` is in ms. */
export interface Clock {
  now(): number;
}

/** Header names are lower-case. */
export type Headers = Record<string, string>;

/** `method` defaults to 'GET'; header names may be any case. */
export interface CacheRequest {
  url: string;
  method?: string;
  headers?: Headers;
}

/** What the origin returns. Its header names are already lower-case. */
export interface OriginResponse {
  status: number;
  headers: Headers;
  body: string;
}

export type CacheStatus = 'HIT' | 'MISS' | 'REVALIDATED';

/** A response plus how the cache produced it. */
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
