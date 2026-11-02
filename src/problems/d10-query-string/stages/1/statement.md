Write both directions of a `qs`-style query string codec. Start with flat key/value pairs.

```ts
parse('?a=1&b=2&a=3&c+d=e+f&flag');
// { a: ['1', '3'], b: '2', 'c d': 'e f', flag: '' }
stringify({ q: 'a&b', n: 3, nil: null });
// 'q=a%26b&n=3&nil='
```

```ts
function parse(input: string): Record<string, string | string[]>;
function stringify(obj: Record<string, unknown>): string;
```

**`parse`**
- A leading `?` is ignored. Split on `&` and skip empty parts.
- A part splits at its first `=`. With no `=`, the value is `''`.
- Keys and values: `+` becomes a space, then percent-decoding. If decoding fails (`%E0%A4%A`), keep the text as is (with `+` already replaced).
- Values are strings. A repeated key collects its values into an array, in order: `a=1&a=3` gives `{ a: ['1', '3'] }`.
- Brackets have no meaning yet: `a[b]=1` gives the key `'a[b]'`.
- Inputs in this stage don't use the keys `__proto__`, `constructor` or `prototype`.

**`stringify`**
- Walk keys in insertion order and emit `key=value` pairs joined with `&`.
- Key names and values go through `encodeURIComponent`.
- `undefined` and functions are skipped, and `null` gives `key=`.
- Dates use `toISOString()`, and other values use `String(v)`.
- Values in this stage are never arrays or plain objects.
