# Deep diff & patch: moves and round-trips

Add `diff(a, b, { objectHash })`, which matches array items by identity.

```ts
diff([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [{ id: 'c' }, { id: 'a' }, { id: 'b' }], { objectHash: (x: any) => x.id });
// [{ op: 'move', from: '/2', path: '/0' }]
```

```ts
diff(a: unknown, b: unknown, options?: { objectHash?: (item: unknown, index: number) => string }): Operation[]
```

- With `objectHash`, array items (at every depth) are matched by their hash instead of by index.
- Items that only change position become `move` ops, not chains of `replace`. A pure reorder produces only `move` ops, and no more than `length - 1` of them. <!-- tests: objectHash: a pure reorder is only move ops -->
- Items whose hash is gone are `remove`d, and new hashes are `add`ed. <!-- tests: objectHash: moved items are diffed in place; new and gone items add/remove -->
- Matched items are diffed recursively at their new position. <!-- tests: objectHash: moved items are diffed in place; new and gone items add/remove -->
- Without `objectHash`, `diff` behaves as before.
- The diff and the patch must round-trip: `isEqual(applyPatch(a, diff(a, b, opts)), b)` holds for any `a` and `b`, with or without `objectHash`. <!-- tests: round-trip property: 300 random pairs with and without objectHash -->
