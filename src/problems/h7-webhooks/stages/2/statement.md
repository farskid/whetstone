# Webhook verify & idempotency: idempotency

Stripe may deliver the same event more than once. Add a handler that runs each event **once**, however often it arrives.

```ts
const hooks = createWebhookHandler({ handle: (e) => db.markPaid(e.data) });
await hooks.process(event); // { status: 'applied', result, duplicate: false }
await hooks.process(event); // { status: 'applied', result, duplicate: true }; handle isn't called again
```

## Idempotency

`createWebhookHandler({ handle })` returns a `WebhookHandler` (`{ process(event) }`). Each event has an `id`, and `process` resolves to `{ status: 'applied', result, duplicate }`, where `result` is what `handle` resolved to.

The rules:

- **Repeats.** An `id` that was seen before returns the stored outcome with `duplicate: true`, and `handle` isn't called again. <!-- tests: a repeated event id returns the stored result -->
- **Concurrent duplicates.** A duplicate that arrives while the first delivery is still running waits for that delivery's outcome. <!-- tests: concurrent duplicates wait for the first delivery -->
- **Failures.** If `handle` rejects, every delivery waiting on it rejects with that error, and the `id` is forgotten, so the next delivery tries again. <!-- tests: a failed handler leaves the event retryable -->
- **New events.** The first delivery of an `id` calls `handle` and has `duplicate: false`.

Everything from earlier stages still applies.
