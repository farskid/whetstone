# Deep diff & patch: apply

Add `applyPatch(doc, ops)`. It applies the operations in order and returns the new document.

```ts
applyPatch({ list: [1] }, [{ op: 'add', path: '/list/-', value: 2 }, { op: 'copy', from: '/list', path: '/copy' }]);
// { list: [1, 2], copy: [1, 2] }
```

```ts
type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

applyPatch<T>(doc: T, ops: Operation[]): T
class PatchError extends Error { index: number; operation: Operation }
```

| Op | Behavior |
| --- | --- |
| `add` | Into an object, sets the key. Into an array, inserts at the index (`0..length`) or appends with `-`. The parent must exist. `path: ''` replaces the document. <!-- tests: add / remove / replace including "-" and root --> |
| `remove` | The target must exist. Removing the root is an error. <!-- tests: add / remove / replace including "-" and root --> |
| `replace` | The target must exist. `path: ''` replaces the document. <!-- tests: add / remove / replace including "-" and root --> |
| `move` | `from` must exist. Moving a value into one of its own children is an error. Moving to the same path does nothing. <!-- tests: move, copy and test --> |
| `copy` | Adds a deep copy of the value at `from`. <!-- tests: move, copy and test --> |
| `test` | Throws unless the target `isEqual`s `value`. <!-- tests: move, copy and test --> |

- Array indices must be canonical decimal integers: `01` and `1.0` are invalid. Indices past the end are errors (`length` is allowed only for `add`). An unknown `op` is an error. <!-- tests: invalid paths and indices throw PatchError with the op index -->
- **Immutable**: the input `doc` and the op values are never mutated, and the result shares no objects with them. <!-- tests: applyPatch is immutable and atomic -->
- **Atomic**: if any operation fails, throw a `PatchError` (exported, `name` is `'PatchError'`) with `index` (the failing op's position) and `operation` (the op itself). No partial result escapes. <!-- tests: invalid paths and indices throw PatchError with the op index | applyPatch is immutable and atomic -->
- Round-trip: `isEqual(applyPatch(a, diff(a, b)), b)` holds.
