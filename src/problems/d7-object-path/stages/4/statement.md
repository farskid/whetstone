Add filters to `query`.

```ts
query(store, 'items[?(@.price > 10 && @.tags contains "office")].name');
// [{ path: ['items', 1, 'name'], value: 'lamp' }]
```

- `[?(expr)]` expands like `*`, but keeps only the children for which `expr` is true. Only `query` accepts it.
- A filter's parentheses may nest, and quoted strings inside it may contain `)` or `]`.

**Filter expressions**
- `@` is the child being tested. `@.a.b`, `@[0]` and `@['x y']` read from it the way `get` does, so a missing value is `undefined`.
- Literals are numbers (`-?\d+(\.\d+)?`), `"strings"` / `'strings'` (a backslash escapes the next character), `true`, `false` and `null`.
- `==` / `!=` use strict equality.
- `>` `>=` `<` `<=` are true only when both sides are numbers or both are strings.
- `a contains b` is true if `a` is an array that includes `b`, or a string that includes the string `b`.
- `&&` binds tighter than `||`, and parentheses group.
- A bare operand like `[?(@.active)]` tests truthiness.
- A malformed expression (`@.price >`, unknown words, unbalanced parentheses) throws an `Error`.
