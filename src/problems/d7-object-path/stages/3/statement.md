Add `query`, which returns every match of a path that can contain wildcards.

```ts
query(store, 'items[*].name');
// [{ path: ['items', 0, 'name'], value: 'pen' }, { path: ['items', 1, 'name'], value: 'lamp' }]

interface Match { path: PathKey[]; value: unknown }
function query(obj: unknown, path: string): Match[];
```

- `*` (as a dot segment) or `[*]` means every child. Only `query` accepts it; `get`, `set` and `setIn` still throw.
- `query` starts from `[{ path: [], value: obj }]` and applies each segment to every current match, in order.
- A key keeps the match only if that own property exists (forbidden keys never exist), extending its path with the key.
- `*` expands to every child: array elements by index (numbers in the path), or own enumerable keys in order. Non-containers have no children.
- The empty path gives `[{ path: [], value: obj }]`. Malformed paths throw.
