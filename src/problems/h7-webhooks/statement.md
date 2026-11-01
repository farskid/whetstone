# Webhook verify & idempotency

When **Stripe** calls your webhook, it signs the request. It may also send the same event twice, or deliver events out of order. Build the two pieces a webhook endpoint needs: signature checking, and an idempotent event handler.

## Signatures

The `Stripe-Signature` header looks like `t=1700000000,v1=5257a8…,v0=…`.

**`parseSignatureHeader(header)`** returns `{ timestamp, signatures }`. `signatures` holds every `v1` value in order.

- **Format.** Items are separated by commas, and spaces around an item are ignored.
- **Other keys.** Keys other than `t` and `v1` (such as `v0`) are ignored.
- **Malformed headers.** Throw a `WebhookError` with `code: 'malformed'` if:
  - an item has no key or no `=`;
  - `t` is missing, appears twice, or isn't made only of digits;
  - there is no `v1`.

**`timingSafeEqual(a, b)`** compares two strings in time that doesn't depend on where they first differ. Strings of different lengths are simply not equal.

**`verifySignature({ payload, header, secrets, toleranceSec = 300, clock })`** resolves to `{ timestamp }` or rejects with a `WebhookError`.

- **The expected signature** is the HMAC-SHA256 of `` `${t}.${payload}` ``, written as lowercase hex. Compute it with `crypto.subtle`.
- **Use the raw body.** `payload` must be the body exactly as received. Re-serialized JSON has different bytes, so it won't match.
- **Matching.** The header is valid if **any** `v1` value matches the expected signature for **any** of the `secrets`. `secrets` can be one string or an array. If nothing matches, reject with `code: 'no_match'`.

## Replay protection

- **Too old.** After the signature matches, check its age. If `now − t` is more than `toleranceSec` seconds, reject with `code: 'too_old'`.
  - `now` is `clock.now()` in ms, or `Date.now()` if no clock is given. Round it down to whole seconds.
  - A timestamp ahead of your clock is accepted.
- **Order of checks.** The signature is always checked first, so a bad signature is reported as `no_match` even when it's old.

## Idempotency

`createWebhookHandler({ handle, getKey?, getVersion? })` returns `{ process(event) }`. Each event has an `id`, and `process` resolves to one of:

- `{ status: 'applied', result, duplicate }`
- `{ status: 'stale', duplicate }`

The rules:

- **Repeats.** An `id` that was seen before returns the stored outcome with `duplicate: true`, and `handle` isn't called again.
- **Concurrent duplicates.** A duplicate that arrives while the first delivery is still running waits for that delivery's outcome.
- **Failures.** If `handle` rejects, every delivery waiting on it rejects with that error, and the `id` is forgotten, so the next delivery tries again.

## Rotation and ordering

- **Secret rotation.** This is the `secrets` array plus multiple `v1` values (see above). During a rotation, either secret works.
- **`getKey(event)`** names the object an event is about. Events with the same key run **one at a time, in arrival order**. Events with different keys don't wait for each other. A failed event doesn't block the events behind it.
- **`getVersion(event)`** works together with `getKey`. When an event's turn comes:
  - If its version isn't newer than the last version **applied** for that key, it is skipped with `status: 'stale'` and `handle` isn't called.
  - Only a successful `handle` records a new version.
  - Stale outcomes are remembered for duplicates too.
- **Without `getKey`**, events don't wait for each other and are never stale.
