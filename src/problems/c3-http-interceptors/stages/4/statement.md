Fix the classic production bug: when the token expires, *ten* parallel requests get `401`, and the app fires *ten* refresh calls.

```ts
await Promise.all([api.get('/me'), api.get('/orders'), api.get('/cart')]); // token expired → ONE refresh
```

The API is unchanged. The stage 3 rules still hold, with these changes:

- **Single flight.** Only one `refresh()` can be in flight. Every 401 that arrives while it runs waits for that same refresh, then retries. A 401 after it has finished (settled) may start a new one.
- **Hold new requests.** If a refresh is in progress, the request interceptor waits for it to settle before reading `getToken()`, so a new request never goes out with a token known to be expired. It waits even if the refresh fails.
- **Stale 401s.** If a 401's request went out with a token that is no longer current (its `Authorization` isn't `Bearer <getToken()>`, and `getToken()` isn't `null`), someone already refreshed. Retry without refreshing.
- **Refresh failure.** If the refresh fails, every request waiting on it rejects with the refresh error.
