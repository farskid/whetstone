# Indexed priority queue

Build the heap that schedulers use: a priority queue where every item has an id, so you can change or cancel it later. Then use it to build virtual timers.

```ts
const q = new IndexedPQ<string>();
q.push('a', 5, 'job A'); q.push('b', 1, 'job B');
q.update('a', 0);
q.pop();   // { id: 'a', priority: 0, value: 'job A' }
```

## API

```ts
type Id = string | number;
interface Entry<V, P> { id: Id; priority: P; value: V }

class IndexedPQ<V = undefined, P = number> {
  constructor(compare?: (a: P, b: P) => number);   // default: (a, b) => a - b (smallest first)
  push(id: Id, priority: P, value?: V): void;
  pop(): Entry<V, P> | undefined;
  peek(): Entry<V, P> | undefined;
  readonly size: number;
  has(id: Id): boolean;
  update(id: Id, priority: P): boolean;
  remove(id: Id): boolean;
}

class VirtualTimers {
  now(): number;   // starts at 0
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
  advance(ms: number): void;
}
```

## Rules

**IndexedPQ**
- `pop` and `peek` return the entry with the smallest priority according to `compare` (negative means `a` comes first). On an empty queue they return `undefined`.
- **Stable ties.** Entries with equal priority come out in the order they were pushed. An `update` counts as a fresh push for this purpose, so an updated entry goes behind existing entries of the same priority.
- `push` of an id that's already in the queue throws an `Error`.
- `update` and `remove` return `false` (and do nothing) for an unknown id, `true` otherwise. Both must be O(log n). Keep an id → heap index map.
- `update` may raise or lower the priority.

**VirtualTimers**
- `setTimeout(cb, ms)` schedules `cb` at `now() + max(0, ms)` and returns a numeric id. `clearTimeout` cancels it (unknown ids are ignored).
- `advance(ms)` moves time forward to `now() + ms`, running every timer due at or before that time in order of due time, and for equal times in the order they were scheduled. While a callback runs, `now()` equals that timer's due time.
- Timers scheduled by a callback that fall due within the same `advance` also run in it, including a `setTimeout(cb, 0)` (it runs at the current time, after the timers already due then).
- A callback can cancel other timers, and canceled timers don't run.
