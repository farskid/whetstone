Add the security limits that make `parse` safe for untrusted input.

```ts
parse('a[b][c][d]=1', { depth: 1 });          // { a: { b: { '[c][d]': '1' } } }
parse('a[999999]=x');                         // { a: { '999999': 'x' } }
parse('__proto__[polluted]=1&ok=1');          // { ok: '1' }

function parse(input: string, opts?: { depth?: number; parameterLimit?: number; arrayLimit?: number }): Record<string, Value>;
```

- **`depth`** (default 5): at most `depth` bracket groups are split off. Anything left over becomes one literal key: with `depth: 1`, `a[b][c][d]` gives `{ a: { b: { '[c][d]': … } } }`.
- **`parameterLimit`** (default 1000): only the first `parameterLimit` non-empty parts are used.
- **`arrayLimit`** (default 20): only indices from `0` to `arrayLimit` count as array indices. A larger number is an ordinary object key, so `a[999999]=x` makes `{ a: { '999999': 'x' } }`.
- If any path segment is `__proto__`, `constructor` or `prototype`, the whole pair is dropped. `Object.prototype` must never change.
