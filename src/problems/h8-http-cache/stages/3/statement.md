# HTTP response cache: vary and privacy

Add the rules that stop the cache serving one user's response to another: **variants** by `Vary`, and responses that must never be stored. `createHttpCache` now takes `shared?: boolean` (default `false`) for a proxy or CDN cache.

```ts
const cdn = createHttpCache({ fetch: origin, shared: true });
await cdn.fetch({ url: '/home', headers: { 'Accept-Language': 'fi' } }); // stored separately from 'en'
```

## Rules

- **Variants.** `Vary: Accept-Language` means one stored variant per value of that request header. A missing header counts as its own value. A new response replaces only the variant it matches.
- **Never stored:**
  - `no-store`;
  - `Vary: *`;
  - `private`, in a shared cache (`shared: true`).
- **`s-maxage`.** Only a shared cache uses it. In a shared cache it comes before `max-age` in the freshness lifetime.
- **Directives.** Directive names are case-insensitive.
- **Unstorable replies.** A response that can't be stored removes the variant it would have replaced.

Everything from earlier stages still applies.
