# HTTP response cache

Browsers and CDNs follow RFC 9111 to decide when a stored response can be reused, and stores like **cacache** keep the bytes on disk. Build the decision part: `createHttpCache({ fetch, clock?, shared? })`. It returns `{ fetch(request) }`, where a request is `{ url, method?, headers? }`.

- **Results.** Each result is `{ status, headers, body, cache }`, and `cache` is one of `'HIT'`, `'MISS'`, `'REVALIDATED'` or `'STALE'`.
- **Header names.** They are case-insensitive. Lower-case them on the way in. The origin's headers are already lower-case.
- **Time.** Times come from `clock.now()` in ms, or `Date.now()` if no clock is given.

## Freshness

- **What gets stored.** Only `GET` requests are cached, and only responses with status 200, 203, 204, 300, 301, 404 or 410.
- **Other methods.** Requests with any other method go straight to the origin and come back as `MISS`. When a `POST`, `PUT`, `PATCH` or `DELETE` succeeds (status < 400), it removes everything stored for that URL. Method names are case-insensitive.
- **Freshness lifetime.** Take the first rule that applies:
  1. `s-maxage` (shared caches only);
  2. `max-age`;
  3. `Expires − Date`. An invalid `Expires` means the response is already stale.
  4. 10% of `Date − Last-Modified`;
  5. otherwise 0.

  If a response has no `Date` header, use the time it arrived.
- **Current age** (RFC 9111 §4.2.3), in seconds:
  - `apparent = max(0, responseTime − Date)`;
  - `corrected = Age header + (responseTime − requestTime)`;
  - `age = max(apparent, corrected) + (now − responseTime)`.
- **Fresh hits.** A response is fresh while `age < lifetime`. A fresh hit returns the stored response with `cache: 'HIT'` and an `age` header (whole seconds, rounded down).

## Revalidation

- **Conditional requests.** When a stored response is stale and has a validator, send a conditional request:
  - `If-None-Match` comes from `ETag`;
  - `If-Modified-Since` comes from `Last-Modified`;
  - keep the caller's own headers too.
- **A 304 reply.** Merge the 304's headers into the stored ones, restart the age from this exchange, and return the stored body and status with `cache: 'REVALIDATED'`.
- **Any other reply.** It replaces the stored copy and is returned as `MISS`.
- **`no-cache`.** A response with `no-cache` is revalidated on every use, even when it's fresh.

## Vary and privacy

- **Variants.** `Vary: Accept-Language` means one stored variant per value of that request header. A missing header counts as its own value. A new response replaces only the variant it matches.
- **Never stored:**
  - `no-store`;
  - `Vary: *`;
  - `private`, in a shared cache (`shared: true`).
- **`s-maxage`.** Only a shared cache uses it.
- **Directives.** Directive names are case-insensitive.
- **Unstorable replies.** A response that can't be stored removes the variant it would have replaced.

## Stale responses

`no-cache` and `must-revalidate` turn off both of these rules.

- **`stale-while-revalidate=N`.** While the response is stale by at most N seconds, return it at once with `cache: 'STALE'` and revalidate in the background.
  - Only one background revalidation can run per stored response at a time.
  - A background failure is ignored, and the next stale hit may try again.
- **`stale-if-error=N`.** While the response is stale by at most N seconds, a network error or a 500, 502, 503 or 504 from the origin returns the stored copy with `cache: 'STALE'`. The stored copy is kept.
- **Past the window**, the origin's answer, or its error, goes to the caller.
