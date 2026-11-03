# Webhook verify & idempotency: signatures

When **Stripe** calls your webhook, it signs the request, so you can tell it really came from Stripe and wasn't replayed later. Start by checking those signatures.

```ts
await verifySignature({ payload: rawBody, header: req.headers['stripe-signature'], secrets: 'whsec_…' });
// resolves to { timestamp } or rejects with a WebhookError ('malformed' | 'no_match' | 'too_old')
```

`WebhookError` is given in the starter. It has a `code` field.

## Signatures

The `Stripe-Signature` header looks like `t=1700000000,v1=5257a8…,v0=…`.

**`parseSignatureHeader(header)`** returns `{ timestamp, signatures }`. `signatures` holds every `v1` value in order. <!-- tests: parseSignatureHeader reads t and every v1 -->

- **Format.** Items are separated by commas, and spaces around an item are ignored.
- **Other keys.** Keys other than `t` and `v1` (such as `v0`) are ignored.
- **Malformed headers.** Throw a `WebhookError` with `code: 'malformed'` if:
  - an item has no key or no `=`;
  - `t` is missing, appears twice, or isn't made only of digits;
  - there is no `v1`.

**`timingSafeEqual(a, b)`** compares two strings in time that doesn't depend on where they first differ. Strings of different lengths are simply not equal. <!-- tests: timingSafeEqual compares whole strings -->

**`verifySignature({ payload, header, secrets, toleranceSec = 300, clock })`** resolves to a `VerifyResult` (`{ timestamp }`) or rejects with a `WebhookError`.

- **The expected signature** is the HMAC-SHA256 of `` `${t}.${payload}` ``, written as lowercase hex. Compute it with `crypto.subtle`. <!-- tests: a correct HMAC-SHA256 signature verifies -->
- **Use the raw body.** `payload` must be the body exactly as received. Re-serialized JSON has different bytes, so it won't match.
- **Matching.** `secrets` is one string. The header is valid if **any** `v1` value matches the expected signature. If nothing matches, reject with `code: 'no_match'`. <!-- tests: a correct HMAC-SHA256 signature verifies | a changed body, timestamp or secret does not verify -->

## Replay protection

- **Too old.** After the signature matches, check its age. If `now − t` is more than `toleranceSec` seconds, reject with `code: 'too_old'`. <!-- tests: timestamps older than the tolerance are rejected -->
  - `now` is `clock.now()` in ms, or `Date.now()` if no clock is given. Round it down to whole seconds.
  - A timestamp ahead of your clock is accepted.
- **Order of checks.** The signature is always checked first, so a bad signature is reported as `no_match` even when it's old.
