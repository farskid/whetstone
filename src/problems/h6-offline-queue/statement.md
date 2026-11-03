# Offline mutation queue

A user edits a note on the subway with no signal. The app must keep every write, send them **in order** when the connection comes back, survive a reload in between, and not hammer a failing server. This is what **Workbox background sync** and **offline mutations** in TanStack Query do.

```ts
const q = createOfflineQueue({ send: (m) => api.post(`/${m.type}`, m.payload), storage: localStorage, online: navigator.onLine });
window.addEventListener('online', () => q.setOnline(true));
window.addEventListener('offline', () => q.setOnline(false));

q.enqueue('note.update', { id: 7, text: 'draft' }, { dedupeKey: 'note:7' });
q.enqueue('note.update', { id: 7, text: 'final' }, { dedupeKey: 'note:7' }); // replaces the queued one
```

## API

```ts
interface Mutation { id: number; type: string; payload: unknown; dedupeKey?: string; attempts: number }
type Outcome = { ok: true; value: unknown } | { ok: false; error: unknown };

function createOfflineQueue(options: {
  send(m: Mutation): Promise<unknown>;
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  storageKey?: string;                              // default 'offline-queue'
  online?: boolean;                                 // initial connectivity, default true
  maxRetries?: number;                              // default 3
  retryDelay?: (attempt: number) => number;         // default n => 1000 * 2 ** (n - 1)
  isRetryable?: (error: unknown) => boolean;        // default: true unless error.status is 400–499
  onSettled?: (m: Mutation, outcome: Outcome) => void;
  clock?: { setTimeout(fn: () => void, ms: number): number; clearTimeout(id: number): void };
}): OfflineQueue;

interface EnqueueOptions { dedupeKey?: string }

interface OfflineQueue {
  enqueue(type: string, payload: unknown, opts?: EnqueueOptions): number; // returns the id
  setOnline(online: boolean): void;
  pending(): Mutation[];                            // copies, queue order, including the one in flight
}
```

## Rules

**Order**
- Mutations are sent **one at a time**, in FIFO order. The next one isn't sent until the current one has succeeded or been dropped.
- Sending starts on its own: after `enqueue`, on `setOnline(true)` and at startup. Each start is on a microtask, never synchronously inside the call.

**Offline**
- While offline, nothing new is sent.
- A send that is already in flight finishes, and its outcome is handled normally. If it failed, don't schedule a retry; wait for `online`.

**Persistence**
- After every change to the queue (enqueue, coalesce, success, drop, attempts change), write `JSON.stringify(pending())` to `storage` under `storageKey`.
- On creation, restore the queue from storage. New ids continue after the largest restored id; ids start at 1.

**Retries**
- When `send` rejects and `isRetryable(error)` is true, increment `attempts`, which counts the failed sends of that mutation.
- If `attempts <= maxRetries`, wait `retryDelay(attempts)` on the clock, then send the **same** mutation again. The queue is blocked meanwhile.
- If `attempts > maxRetries`, the mutation is dropped.
- A non-retryable error drops the mutation immediately.
- Going offline cancels a pending retry timer. Coming back online sends right away, and the attempts are kept.

**Coalescing.** `enqueue` with a `dedupeKey` that matches a queued mutation **that is not in flight** replaces that mutation's `type` and `payload` in place. It keeps that mutation's position, id and attempts, and returns its id. If the only match is in flight, append a new mutation instead.

**`onSettled`** is called once per mutation that leaves the queue, either `{ ok: true, value }` on success or `{ ok: false, error }` when dropped, with the last error. A coalesced-away payload isn't reported separately.
