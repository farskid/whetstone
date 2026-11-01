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

export function createHttpCache(options: CacheOptions): HttpCache {
  throw new Error('Not implemented');
}
