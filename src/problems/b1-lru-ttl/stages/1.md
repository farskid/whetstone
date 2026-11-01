Build `LRUCache<K, V>`, a small version of **lru-cache**. It's a map with a size limit that evicts the **least recently used** entry.

```ts
const cache = new LRUCache<string, User>({ max: 500 });
cache.set('u1', user);
cache.get('u1');   // user (and u1 becomes most recently used)
```

`max` is the maximum number of entries. It must be an integer `>= 1`; otherwise the constructor throws a `TypeError`.

| method | recency | notes |
|---|---|---|
| `get(key)` | **marks as most recent** | `undefined` when missing |
| `peek(key)` | no change | like `get` without touching recency |
| `has(key)` | no change | a stored `undefined` still counts |
| `set(key, value)` | **marks as most recent** | returns `this`; evicts the LRU entry when over `max` |
| `delete(key)` | | returns `true` if an entry was removed |
| `clear()` | | removes everything |
| `size` | | number of entries |
| `keys()` | | keys, most recent first |

- Keys compare by identity, like `Map`. Any value can be stored, falsy ones included.
- `get`, `set`, `has`, `peek` and `delete` must be **O(1)**. The tests use 50,000 operations.
