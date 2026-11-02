Build the core of Immer. `produce(base, recipe)` hands `recipe` a **draft** you can mutate freely. It returns a new state with those changes and leaves `base` untouched.

```ts
const base = { count: 1, user: { name: 'Lin' } };
const next = produce(base, (draft) => {
  draft.user.name = 'Ada';
  delete draft.count;
});
next;                                       // { user: { name: 'Ada' } }
base;                                       // unchanged
produce(base, (d) => { d.count = 1; });     // base itself: nothing changed
```

```ts
type Recipe<T> = (draft: T) => void;
function produce<T>(base: T, recipe: Recipe<T>): T;
```

- In this stage `base` is a plain object or an array, and so is every nested value you need to draft. Objects are plain when their prototype is `Object.prototype` or `null`.
- Use a `Proxy`. Reading a nested object or array through a draft gives a draft of it, so writes at any depth work. A draft of an array passes `Array.isArray`.
- Reads behave like the real object: property reads, `Object.keys`, `in`, and so on.
- **Copy-on-write:** `base` and everything inside it are never mutated. The first write to a level makes a shallow copy of that level, and that level and all its ancestors count as modified.
- Assigning a value that is `Object.is`-equal to the current one, or deleting a key that isn't there, is not a change.
- **Result:** an unmodified level returns its base object, so a recipe that only reads returns `base` itself. A modified level returns its copy, with child drafts replaced by their results.
- If a modified level ends up shallowly equal to its base (same keys, `Object.is`-equal values), return the base instead: `d.a = 2; d.a = 1` is not a change, at any depth.
- The recipe returns nothing. Return values come in a later stage.
