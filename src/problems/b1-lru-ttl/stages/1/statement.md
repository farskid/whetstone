Build `LRUCache<K, V>`, a small version of **lru-cache**. It's a map with a size limit that evicts the **least recently used** entry.

```ts
const cache = new LRUCache<string, User>({ max: 500 });
cache.set('u1', user);
cache.get('u1');   // user (and u1 becomes most recently used)
```

`max` is the maximum number of entries. It must be an integer `>= 1`; otherwise the constructor throws a `TypeError`. <!-- tests: evicts the least recently used entry at max | an invalid max throws TypeError -->

| method | recency | notes |
|---|---|---|
| `get(key)` | **marks as most recent** | `undefined` when missing <!-- tests: set / get / has / delete basics | get() refreshes recency, peek() and has() do not --> |
| `peek(key)` | no change | like `get` without touching recency <!-- tests: get() refreshes recency, peek() and has() do not --> |
| `has(key)` | no change | a stored `undefined` still counts <!-- tests: get() refreshes recency, peek() and has() do not | stores falsy values and non-string keys --> |
| `set(key, value)` | **marks as most recent** | returns `this`; evicts the LRU entry when over `max` <!-- tests: set / get / has / delete basics | evicts the least recently used entry at max | set() on an existing key updates it and makes it most recent --> |
| `delete(key)` | | returns `true` if an entry was removed <!-- tests: set / get / has / delete basics --> |
| `clear()` | | removes everything |
| `size` | | number of entries <!-- tests: set / get / has / delete basics | evicts the least recently used entry at max --> |
| `keys()` | | keys, most recent first <!-- tests: evicts the least recently used entry at max | get() refreshes recency, peek() and has() do not --> |

- Keys compare by identity, like `Map`. Any value can be stored, falsy ones included. <!-- tests: stores falsy values and non-string keys -->
- `get`, `set`, `has`, `peek` and `delete` must be **O(1)**. The tests use 50,000 operations. <!-- tests: O(1) operations: 50k mixed ops stay fast -->
