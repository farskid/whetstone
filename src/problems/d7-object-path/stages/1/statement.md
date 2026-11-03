Write `get`, the reading half of a `lodash.get`/`lodash.set` mix with a JSONPath-style path syntax.

```ts
const store = { items: [{ name: 'pen' }, { name: 'lamp' }], user: { 'first.last': 'A.L' } };
get(store, 'items[1].name');            // 'lamp'
get(store, "user['first.last']");       // 'A.L'
get(store, 'items[5].name', 'none');    // 'none'
```

```ts
type PathKey = string | number;
function get(obj: unknown, path: string | PathKey[], defaultValue?: unknown): unknown;
```

**Path syntax**
- `a.b`: a dot separates keys. A segment of only digits (`a.0`) is an array index (a number). <!-- tests: dots, indexes, quoted keys and array paths -->
- `[0]`: an index (digits only). <!-- tests: dots, indexes, quoted keys and array paths -->
- `['a.b']` / `["a.b"]`: a quoted key, which can contain any characters. A backslash escapes the next character. <!-- tests: dots, indexes, quoted keys and array paths -->
- `''` is the empty path.
- `get` also accepts an array of keys, like `['a', 0, 'b']`, used as is. <!-- tests: dots, indexes, quoted keys and array paths -->
- Throw an `Error` for malformed paths, like `a..b`, `a.`, `a[`, `a[x]` or an unclosed quote. <!-- tests: prototype keys are never followed; malformed paths throw -->
- `*` (as a dot segment) and `[*]` are reserved for a later `query` function: `get` throws for them.

**`get`**
- Follows only own properties, so inherited ones like `toString` are missing.
- Returns `defaultValue` when a step is missing or isn't an object (for example a `null` or a string partway through), or when the final value is `undefined`. <!-- tests: defaults: missing steps and null partway; falsy values are real -->
- Other falsy values (`0`, `''`, `false`, `null`) are real values. <!-- tests: defaults: missing steps and null partway; falsy values are real -->
- The empty path returns `obj`.
- **Security:** the keys `__proto__`, `constructor` and `prototype` are never followed, even as own keys. They count as missing. <!-- tests: prototype keys are never followed; malformed paths throw -->
