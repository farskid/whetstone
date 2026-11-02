# Webhook verify & idempotency: rotation and ordering

Add secret rotation, and per-object ordering so an old event can't undo a newer one.

```ts
const hooks = createWebhookHandler({ handle, getKey: (e) => e.data.object.id, getVersion: (e) => e.created });
// process now resolves to { status: 'applied', result, duplicate } or { status: 'stale', duplicate }
```

## Rotation and ordering

- **Secret rotation.** `secrets` can now be one string or an array. The header is valid if **any** `v1` value matches the expected signature for **any** of the secrets. An empty array matches nothing (`no_match`).
- **`getKey(event)`** names the object an event is about. Events with the same key run **one at a time, in arrival order**. Events with different keys don't wait for each other. A failed event doesn't block the events behind it.
- **`getVersion(event)`** works together with `getKey`. When an event's turn comes:
  - If its version isn't newer than the last version **applied** for that key, it is skipped with `status: 'stale'` and `handle` isn't called.
  - Only a successful `handle` records a new version.
  - Stale outcomes are remembered for duplicates too.
- **Without `getKey`**, events don't wait for each other and are never stale.

Everything from earlier stages still applies.
