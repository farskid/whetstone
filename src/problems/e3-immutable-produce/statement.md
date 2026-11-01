# Immutable produce

Build the core of Immer. `produce(base, recipe)` hands `recipe` a **draft** you can mutate freely. It returns a new immutable state containing those changes and leaves `base` untouched.

```ts
const next = produce(state, (draft) => {
  draft.user.name = 'Ada';
  draft.todos.push({ title: 'write tests' });
});
next.settings === state.settings;   // true: untouched subtrees are shared
Object.isFrozen(next);              // true
```

Exports: `produce`, `produceWithPatches`, `applyPatches` and `nothing`.

## Drafts

**What gets a draft.** Plain objects (prototype `Object.prototype` or `null`), arrays, `Map`s and `Set`s.
- Children get drafts lazily, when they're read through a draft.
- Use a `Proxy` for objects and arrays. Drafts of arrays must pass `Array.isArray`. Map and Set drafts must be `instanceof Map` / `Set` and support their usual methods and iteration.
- Set **members** aren't drafted. They're returned as they are.

**Copy-on-write**
- The base is never mutated.
- The first write to a draft makes a shallow copy of that level and marks it and all its ancestors as modified.
- Assigning a value that is `Object.is`-equal to the current one is not a change.

**Result**
- An unmodified draft returns its base object, so a no-op recipe returns `base` itself.
- A modified draft returns its copy, with child drafts replaced by their results.
- If a modified level ends up shallowly equal to its base (same keys, `Object.is`-equal values), return the base instead. For example, `draft.a = 2; draft.a = 1` is not a change.
- Every new object or array in the result is `Object.freeze`d. A draft placed somewhere new, such as `draft.b = draft.a`, ends up as its finalized value there.

**After `produce` returns**, every draft created during it is revoked. Any use of a saved draft throws.

**Non-draftable bases** (primitives, class instances) are passed to the recipe as they are.

## Return values

The recipe may return a value:
- `undefined` or the draft itself means "use the draft".
- Any other value becomes the result, with any drafts inside it finalized.
- `nothing` produces `undefined`.

Returning a new value **after** modifying the draft throws.

## Patches

`produceWithPatches(base, recipe)` returns `[result, patches, inversePatches]`. A patch is `{ op: 'add' | 'remove' | 'replace', path, value? }`, where `path` is an array of keys. Array indices are numbers.

Generate them per modified level, recursing into child drafts that changed. Patches go in this order:

**Objects**
1. The base's keys in order: `remove` if the key is gone, otherwise `replace` (or recurse) if the value changed.
2. Then `add` for new keys.

**Arrays**
1. Each common index: `replace` or recurse.
2. Then `add` new indices in ascending order, or `remove` dropped indices from the end (descending).

**Maps:** like objects, keyed by the Map key.

**Sets:** a changed Set is one `replace` of the whole Set.

**Root:** a replaced root (a returned value) is `{ op: 'replace', path: [] }`.

**Inverse patches** undo the change when applied in order.

`applyPatches(base, patches)` applies patches immutably (through `produce`):
- `add` on an array index inserts;
- `remove` on an array index splices;
- on objects and Maps, `add` and `replace` set and `remove` deletes;
- `path: []` replaces the root.
