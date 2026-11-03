# HTTP response cache: revalidation

A stale response often hasn't changed. Add **revalidation**: ask the origin whether the stored copy is still good, and reuse it on a `304 Not Modified`. Results can now also be `cache: 'REVALIDATED'`.

```ts
// stored /a has ETag "v1" and is stale
await cache.fetch({ url: '/a' }); // origin gets If-None-Match: "v1", answers 304 → REVALIDATED
```

## Rules

- **Conditional requests.** When a stored response is stale and has a validator, send a conditional request: <!-- tests: revalidates a stale response with its validators; a 304 refreshes it -->
  - `If-None-Match` comes from `ETag`;
  - `If-Modified-Since` comes from `Last-Modified`;
  - keep the caller's own headers too.
- **A 304 reply.** Merge the 304's headers into the stored ones, restart the age from this exchange, and return the stored body and status with `cache: 'REVALIDATED'`. <!-- tests: revalidates a stale response with its validators; a 304 refreshes it -->
- **Any other reply.** It replaces the stored copy and is returned as `MISS`. <!-- tests: a 200 to a conditional request replaces the stored response -->
- **`no-cache`.** A response with `no-cache` is revalidated on every use, even when it's fresh. <!-- tests: no-cache and max-age=0 revalidate on every use -->
- **No validator.** A stale response with neither `ETag` nor `Last-Modified` is fetched again as in stage 1.

Everything from earlier stages still applies.
