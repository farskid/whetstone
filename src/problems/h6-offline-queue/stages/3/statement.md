# Offline mutation queue: retries

Servers fail. Add **retries** that back off on a clock and keep the order, and drop mutations that can never succeed.

```ts
const q = createOfflineQueue({ send, storage, maxRetries: 3, onSettled: (m, o) => console.log(m.id, o.ok) });
```

## New options

```ts
type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

maxRetries?: number;                              // default 3
retryDelay?: (attempt: number) => number;         // default n => 1000 * 2 ** (n - 1)
isRetryable?: (error: unknown) => boolean;        // default: true unless error.status is 400–499
onSettled?: (m: Mutation, outcome: Outcome) => void;
clock?: { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void };
```

## Rules

**Retries**
- When `send` rejects and `isRetryable(error)` is true, increment `attempts`, which counts the failed sends of that mutation.
- If `attempts <= maxRetries`, wait `retryDelay(attempts)` on the clock, then send the **same** mutation again. The queue is blocked meanwhile. <!-- tests: retryable failure: backs off on the clock and blocks the queue -->
- If `attempts > maxRetries`, the mutation is dropped. <!-- tests: maxRetries: dropped after attempts exceed it -->
- A non-retryable error drops the mutation immediately. <!-- tests: non-retryable (4xx) errors drop immediately; onSettled reports outcomes -->
- Going offline cancels a pending retry timer. Coming back online sends right away, and the attempts are kept. <!-- tests: going offline cancels a pending retry; online resends right away -->
- A `send` that throws synchronously counts as a rejection. <!-- tests: a send that throws synchronously is treated as a failure -->
- **Order.** The next mutation isn't sent until the current one has succeeded or been dropped.
- **Offline.** If a send that was in flight when going offline fails, don't schedule a retry; wait for `online`. <!-- tests: a send in flight when going offline: failure waits for online, no timer -->
- **Persistence.** Attempts changes and drops are changes to the queue, so they are saved too. <!-- tests: attempts are persisted, so a reload does not reset the retry budget -->

**`onSettled`** is called once per mutation that leaves the queue, either `{ ok: true, value }` on success or `{ ok: false, error }` when dropped, with the last error. <!-- tests: non-retryable (4xx) errors drop immediately; onSettled reports outcomes -->

Everything from earlier stages still applies.
