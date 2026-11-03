# HTTP response cache: freshness

Browsers and CDNs follow RFC 9111 to decide when a stored response can be reused, and stores like **cacache** keep the bytes on disk. Build the decision part: `createHttpCache({ fetch, clock? })`. It returns `{ fetch(request) }`, where a request is `{ url, method?, headers? }`.

- **Results.** Each result is `{ status, headers, body, cache }`, and `cache` is `'HIT'` or `'MISS'`.
- **Header names.** They are case-insensitive. Lower-case them on the way in. The origin's headers are already lower-case.
- **Time.** Times come from `clock.now()` in ms, or `Date.now()` if no clock is given.

```ts
const cache = createHttpCache({ fetch: origin });
await cache.fetch({ url: '/a' }); // MISS; origin sent Cache-Control: max-age=60
await cache.fetch({ url: '/a' }); // HIT, with an age header
```

## Rules

- **What gets stored.** Only `GET` requests are cached, and only responses with status 200, 203, 204, 300, 301, 404 or 410. <!-- tests: caches only GET responses with cacheable statuses; unsafe methods invalidate -->
- **Other methods.** Requests with any other method go straight to the origin and come back as `MISS`. When a `POST`, `PUT`, `PATCH` or `DELETE` succeeds (status < 400), it removes everything stored for that URL. Method names are case-insensitive. <!-- tests: caches only GET responses with cacheable statuses; unsafe methods invalidate -->
- **Freshness lifetime.** Take the first rule that applies:
  1. `max-age` from `Cache-Control`; <!-- tests: serves from the cache while max-age lasts, then fetches again -->
  2. `Expires − Date`. An invalid `Expires` means the response is already stale. <!-- tests: falls back to Expires, then to the Last-Modified heuristic -->
  3. 10% of `Date − Last-Modified`; <!-- tests: falls back to Expires, then to the Last-Modified heuristic -->
  4. otherwise 0.

  If a response has no `Date` header, use the time it arrived.
- **Current age** (RFC 9111 §4.2.3), in seconds: <!-- tests: computes the age from the Age header, the Date header and the response delay -->
  - `apparent = max(0, responseTime − Date)`;
  - `corrected = Age header + (responseTime − requestTime)`;
  - `age = max(apparent, corrected) + (now − responseTime)`.
- **Fresh hits.** A response is fresh while `age < lifetime`. A fresh hit returns the stored response with `cache: 'HIT'` and an `age` header (whole seconds, rounded down). <!-- tests: serves from the cache while max-age lasts, then fetches again -->
- **Stale entries.** In this stage a stale response is simply fetched again with the caller's headers. The new reply is returned as `MISS` and replaces the stored copy; a reply with a status that can't be stored removes it.
- **One copy per URL.** Store at most one response per URL. Other `Cache-Control` directives are ignored in this stage.
