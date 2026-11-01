# Deep diff & patch

Build three functions that work on JSON-like values: plain objects, arrays, primitives and `Date`s.

## `isEqual(a, b)`

Deep equality with these rules:
- Primitives compare with SameValueZero, so `NaN` equals `NaN` and `0` equals `-0`.
- `Date`s compare by time.
- Arrays compare element by element.
- Objects compare by their own keys. Key order doesn't matter, but a key set to `undefined` is **not** the same as a missing key.
- Values of different kinds are never equal. For example, an array is never equal to an object, and a `Date` is never equal to a number.

## `diff(a, b, { objectHash? })`

Returns [JSON Patch](https://www.rfc-editor.org/rfc/rfc6902) operations that turn `a` into `b` when applied in order.

**Paths.** Paths are JSON Pointers. In key tokens, `~` is escaped as `~0` and `/` as `~1`. The root path is `''`.

**Equal values.** `isEqual` values produce `[]`.

**Objects.**
- Keys only in `a` are `remove`d first.
- Then, for keys in `b`'s order:
  - a new key is `add`ed;
  - a shared key is diffed recursively.

**Arrays without `objectHash`.**
- Shared indices are diffed recursively.
- Extra trailing items are `remove`d from the end backwards.
- New trailing items are `add`ed in ascending index order.

**Anything else that differs** becomes a single `replace` at that path. That includes changing kind, or a whole root such as `diff(1, [1])` → `[{ op: 'replace', path: '', value: [1] }]`.

**`value`s in ops** are copies, so mutating `b` later doesn't change the patch.

### `objectHash(item, index)`
- With `objectHash`, array items are matched by identity.
- Items that only change position become `move` ops, not long chains of `replace`. A pure reorder produces only `move` ops, and no more than `length - 1` of them.
- Items whose hash is gone are `remove`d, and new hashes are `add`ed.
- Matched items are diffed recursively at their new position.

## `applyPatch(doc, ops)`

Applies the operations and returns the new document.

**Immutable.** The input `doc` and the op values are never mutated, and the result shares no objects with them.

**Atomic.** If any operation fails, it throws a `PatchError` with:
- `index`: the position of the failing op;
- `operation`: the op itself.

No partial result escapes.

Supported operations:

| Op | Behavior |
| --- | --- |
| `add` | Into an object, sets the key. Into an array, inserts at the index (`0..length`) or appends with `-`. The parent must exist. `path: ''` replaces the document. |
| `remove` | The target must exist. Removing the root is an error. |
| `replace` | The target must exist. |
| `move` | `from` must exist. Moving a value into one of its own children is an error. Moving to the same path does nothing. |
| `copy` | Adds a deep copy of the value at `from`. |
| `test` | Throws unless the target `isEqual`s `value`. |

Array indices must be canonical decimal integers: `01` and `1.0` are invalid. Indices past the end are errors. An unknown `op` is an error.

The diff and the patch must round-trip: `isEqual(applyPatch(a, diff(a, b, opts)), b)` holds for any `a` and `b`, with or without `objectHash`.
