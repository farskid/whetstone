Add `set` (mutating) and `setIn` (immutable). Both take the same paths as `get`.

```ts
const o = {};
set(o, 'a[0].b', 1);       // o is now { a: [{ b: 1 }] }
const n = setIn(store, 'items[1].name', 'desk');   // store unchanged; n.items[0] === store.items[0]

function set<T extends object>(obj: T, path: string | PathKey[], value: unknown): T;
function setIn<T>(obj: T, path: string | PathKey[], value: unknown): T;
```

**`set`**
- Mutates `obj`, writes `value` at the path and returns `obj`.
- When a step is missing or isn't an object, it's replaced with a new container: `[]` if the **next** key is a number, `{}` otherwise. So `set({ a: 5 }, 'a.b', 1)` gives `{ a: { b: 1 } }`. <!-- tests: set creates arrays for numeric keys and objects otherwise -->

**`setIn`**
- Has the same semantics, but never mutates.
- It returns a new root in which every object along the path is copied (arrays stay arrays, as copies), while untouched branches are shared by reference. <!-- tests: setIn copies the path and shares everything else -->

**Both**
- Throw an `Error` for the empty path, and (as in `get`) for malformed paths and wildcards.
- **Security:** if any key is `__proto__`, `constructor` or `prototype`, throw `Error('Forbidden key: <key>')` before changing anything. <!-- tests: writes through __proto__, constructor or prototype throw and change nothing -->
