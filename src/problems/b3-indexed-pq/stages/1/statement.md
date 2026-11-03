Build the heap that schedulers use. Later stages give every item an id so you can change or cancel it, and then build virtual timers on top. Start with a plain binary heap.

```ts
const q = new IndexedPQ<string>();
q.push('a', 5, 'job A'); q.push('b', 1, 'job B');
q.peek();   // { id: 'b', priority: 1, value: 'job B' }
q.pop();    // { id: 'b', priority: 1, value: 'job B' }
q.size;     // 1
```

```ts
type Id = string | number;
interface Entry<V, P> { id: Id; priority: P; value: V }

class IndexedPQ<V = undefined, P = number> {
  constructor(compare?: (a: P, b: P) => number);   // default: (a, b) => a - b (smallest first)
  push(id: Id, priority: P, value?: V): void;
  pop(): Entry<V, P> | undefined;
  peek(): Entry<V, P> | undefined;
  readonly size: number;
}
```

- `pop` removes and returns the entry with the smallest priority according to `compare` (negative means `a` comes first). `peek` returns the same entry without removing it. <!-- tests: pops in ascending priority order | custom comparator (max-heap) -->
- On an empty queue, `pop` and `peek` return `undefined`. <!-- tests: pop and peek on an empty queue return undefined -->
- `value` is whatever was passed to `push`, or `undefined` if it was omitted.
- `push` and `pop` must be O(log n): use an array-backed binary heap, not a sorted array.
- For now, ids are just carried along, and the order of equal priorities doesn't matter.
