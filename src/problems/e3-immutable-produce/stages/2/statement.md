Make the result **share**, **freeze** and **revoke** like Immer does.

```ts
const next = produce(state, (d) => { d.user.prefs.theme = 'light'; });
next.settings === state.settings;   // true: untouched subtrees are shared
Object.isFrozen(next);              // true

let saved;
produce(state, (d) => { saved = d.user; });
saved.name;                         // throws: the draft was revoked
```

- **Sharing:** every subtree the recipe didn't modify is the base's own object (`===`), at every depth.
- **Freezing:** every new object or array in the result is `Object.freeze`d, including ones the recipe built (`d.extra = { deep: { x: 1 } }` freezes both levels). The base is never frozen.
- A frozen result can be the base of another `produce`.
- **Revoking:** after `produce` returns, every draft created during it is revoked. Reading or writing a saved draft throws.
- **Moved drafts:** a draft placed somewhere new, such as `d.copy = d.user`, or inside a new object, ends up as its finalized value there. An unmodified one ends up as its base object.
