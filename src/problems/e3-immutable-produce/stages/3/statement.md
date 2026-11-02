Support **array methods**, **Map** and **Set** drafts, and **return values** from the recipe.

```ts
produce({ tags: new Set(['x']) }, (d) => { d.tags.add('y'); });   // { tags: Set { 'x', 'y' } }
produce(base, () => ({ fresh: true }));                          // { fresh: true }
produce(base, () => nothing);                                    // undefined
produce(5, (x) => x + 1);                                        // 6
```

```ts
const nothing: unique symbol;
type Recipe<T> = (draft: T) => T | void | symbol;
```

- **Arrays:** `push`, `splice`, `sort`, `unshift`, assigning `length`, and read-only methods like `map` and `filter` work on drafts. A recipe that only reads still returns `base`.
- **Maps and Sets:** drafts must be `instanceof Map` / `Set` and support their usual methods (`get`, `set`, `has`, `delete`, `add`, `clear`, `size`, `forEach`) and iteration. `map.get(k)` returns a draft of a draftable value. Set **members** aren't drafted; they're returned as they are.
- Setting a Map key to its current value or adding a member a Set already has is not a change. A changed Map or Set in the result is a new Map or Set; the base's stays untouched.
- **Return values:** `undefined` or the draft itself means "use the draft". Any other value becomes the result, with any drafts inside it finalized. Export `nothing`; returning it produces `undefined`.
- Returning a new value **after** modifying the draft throws an `Error`.
- **Non-draftable bases** (primitives, class instances) are passed to the recipe as they are.
