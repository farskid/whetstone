# Offline mutation queue: FIFO while online

A user edits a note on the subway with no signal. The app must keep every write and send them **in order**. This is what **Workbox background sync** and **offline mutations** in TanStack Query do. Start with the ordering: a queue that sends one write at a time.

```ts
const q = createOfflineQueue({ send: (m) => api.post(`/${m.type}`, m.payload), storage: localStorage });
q.enqueue('note.update', { id: 7, text: 'draft' }); // 1
q.enqueue('note.delete', { id: 8 });                 // 2, sent after 1 has finished
```

## API

```ts
interface Mutation { id: number; type: string; payload: unknown; attempts: number }

function createOfflineQueue(options: {
  send(m: Mutation): Promise<unknown>;
  storage: unknown;                                 // not used until the next stage
}): {
  enqueue(type: string, payload: unknown): number; // returns the id
  pending(): Mutation[];                            // copies, queue order, including the one in flight
};
```

## Rules

- Ids start at 1 and go up by one. `attempts` is always 0 in this stage.
- `send` gets a **copy** of the mutation, so changing it doesn't change the queue. The same goes for `pending()`.
- A mutation leaves the queue when its `send` promise resolves.
- In this stage you can assume `send` always resolves.

**Order**
- Mutations are sent **one at a time**, in FIFO order. The next one isn't sent until the current one's promise has resolved.
- Sending starts on its own after `enqueue`. Each start is on a microtask, never synchronously inside the call.
