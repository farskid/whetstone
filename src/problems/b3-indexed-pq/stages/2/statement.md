Make the ids useful: look items up, change their priority, or cancel them.

```ts
class IndexedPQ<V = undefined, P = number> {
  // ...stage 1, plus:
  has(id: Id): boolean;
  update(id: Id, priority: P): boolean;
  remove(id: Id): boolean;
}
```

- `push` of an id that's already in the queue throws an `Error`. Once an id has been popped or removed it may be pushed again.
- `has(id)` is `true` while the id is in the queue.
- `update` may raise or lower the priority. `update` and `remove` return `false` (and do nothing) for an unknown id, `true` otherwise.
- Both must be O(log n). Keep an id → heap index map and keep it right on every swap. There's a performance test with 100k pushes, 50k updates and 100k pops.
