# Object path get/set/query

Write a small mix of `lodash.get`/`lodash.set` and JSONPath: one path syntax for reading, writing and querying.

```ts
const store = { items: [{ name: 'pen', price: 3, tags: ['office'] }, { name: 'lamp', price: 40, tags: ['home', 'office'] }] };
get(store, 'items[1].name');                     // 'lamp'
get(store, 'items[5].name', 'none');             // 'none'
query(store, 'items[?(@.price > 10 && @.tags contains "office")].name');
// [{ path: ['items', 1, 'name'], value: 'lamp' }]
```

## Path syntax

- `a.b`: a dot separates keys. A segment of only digits (`a.0`) is an array index (a number).
- `[0]`: an index.
- `['a.b']` / `["a.b"]`: a quoted key, which can contain any characters. A backslash escapes the next character.
- `*` (as a dot segment) or `[*]`: every child. Only `query` accepts this.
- `[?(expr)]`: every child for which `expr` is true. Only `query` accepts this.
- `''` is the empty path.
- `get` and `set` also accept an array of keys, like `['a', 0, 'b']`.
- Throw an `Error` for malformed paths, like `a..b`, `a.`, `a[`, `a[x]` or a bad filter.
- `get`, `set` and `setIn` throw when given a wildcard or filter.

## Functions

```ts
type PathKey = string | number;
get(obj, path, defaultValue?): unknown
set(obj, path, value): typeof obj
setIn(obj, path, value): typeof obj
query(obj, path: string): { path: PathKey[]; value: unknown }[]
```

**`get`**
- Follows only own properties.
- Returns `defaultValue` when a step is missing or isn't an object (for example a `null` partway through), or when the final value is `undefined`.
- Other falsy values (`0`, `''`, `false`, `null`) are real values.
- The empty path returns `obj`.

**`set`**
- Mutates `obj` and returns it.
- When a step is missing or isn't an object, it's replaced with a new container: `[]` if the **next** key is a number, `{}` otherwise.

**`setIn`**
- Has the same semantics, but never mutates. It returns a new root in which every object along the path is copied (arrays stay arrays), while untouched branches are shared by reference.

**`query`**
- Starts from `[{ path: [], value: obj }]` and applies each segment to every current match.
- A key keeps the match only if that own property exists.
- `*` expands to every child: array elements by index (numbers in the path), or own enumerable keys in order.
- A filter expands the same way but keeps only the children where the expression is true. Non-containers have no children.

**Security.** The keys `__proto__`, `constructor` and `prototype` are never followed. `get` and `query` treat them as missing, and `set` and `setIn` throw `Error('Forbidden key: <key>')` before changing anything.

## Filter expressions

- `@` is the child being tested. `@.a.b`, `@[0]` and `@['x y']` read from it the way `get` does, so a missing value is `undefined`.
- Literals are numbers, `"strings"` / `'strings'`, `true`, `false` and `null`.
- `==` / `!=` use strict equality.
- `>` `>=` `<` `<=` are true only when both sides are numbers or both are strings.
- `a contains b` is true if `a` is an array that includes `b`, or a string that includes the string `b`.
- `&&` binds tighter than `||`, and parentheses group.
- A bare operand like `[?(@.active)]` tests truthiness.
