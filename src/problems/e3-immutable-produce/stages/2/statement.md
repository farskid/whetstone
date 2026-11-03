Make the result **share**, **freeze** and **revoke** like Immer does.

```ts
const next = produce(state, (d) => { d.user.prefs.theme = 'light'; });
next.settings === state.settings;   // true: untouched subtrees are shared
Object.isFrozen(next);              // true

let saved;
produce(state, (d) => { saved = d.user; });
saved.name;                         // throws: the draft was revoked
```

- **Sharing:** every subtree the recipe didn't modify is the base's own object (`===`), at every depth. <!-- tests: nested writes share every untouched subtree -->
- **Freezing:** every new object or array in the result is `Object.freeze`d, including ones the recipe built (`d.extra = { deep: { x: 1 } }` freezes both levels). The base is never frozen. <!-- tests: output is frozen and can be produced from again -->
- A frozen result can be the base of another `produce`. <!-- tests: output is frozen and can be produced from again -->
- **Revoking:** after `produce` returns, every draft created during it is revoked. Reading or writing a saved draft throws. <!-- tests: drafts are revoked after the recipe; moved drafts are finalized -->
- **Moved drafts:** a draft placed somewhere new, such as `d.copy = d.user`, or inside a new object, ends up as its finalized value there. An unmodified one ends up as its base object. <!-- tests: drafts are revoked after the recipe; moved drafts are finalized -->
