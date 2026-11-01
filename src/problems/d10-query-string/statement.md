# Query string codec

`qs` turns `a[b][c]=1&list[]=x` into nested objects and back. Write both directions.

```ts
parse('user[name]=Sam&user[tags][]=a&user[tags][]=b&page=2');
// { user: { name: 'Sam', tags: ['a', 'b'] }, page: '2' }
stringify({ user: { name: 'Sam', tags: ['a', 'b'] } });
// 'user[name]=Sam&user[tags][0]=a&user[tags][1]=b'
```

## `parse(input, { depth = 5, parameterLimit = 1000, arrayLimit = 20 })`

**Pairs**
- A leading `?` is ignored. Split on `&` and skip empty parts.
- Only the first `parameterLimit` parts are used.
- A part splits at its first `=`. With no `=`, the value is `''`.
- Keys and values: `+` becomes a space, then percent-decoding. If decoding fails (`%E0%A4%A`), keep the text as is (with `+` already replaced).
- All leaf values are strings.

**Keys**
- `a[b][c]` is the path `a → b → c`.
- At most `depth` bracket groups are split off. Anything left over becomes one literal key: with `depth: 1`, `a[b][c][d]` gives `{ a: { b: { '[c][d]': … } } }`.
- A key that starts with `[` or has an unclosed `[` is a plain key.
- If any path segment is `__proto__`, `constructor` or `prototype`, the whole pair is dropped.

**Building the result**
- A container is created when a path first needs one.
  - If the next segment is `''` (from `[]`) or an index `0`–`arrayLimit`, it is an array.
  - Otherwise it is an object. So `a[999999]=x` makes `{ a: { '999999': 'x' } }`.
- `[]` pushes onto an array.
- An index sets that slot. Arrays come out compacted in index order, so `a[1]=b&a[0]=a` and `a[5]=x` both work.
- A non-index key on an existing array turns it into an object with the indices as keys: `m[0]=z&m[k]=w` gives `{ m: { 0: 'z', k: 'w' } }`.
- **Writing a leaf where a value exists:**
  - a string becomes `[old, new]`;
  - an array gets `new` pushed;
  - an object ignores the pair.
- A nested write whose path runs through a string ignores the pair: `s=1&s[x]=2` gives `{ s: '1' }`.
- So repeated plain keys become arrays: `a=1&a=3` gives `{ a: ['1', '3'] }`.

## `stringify(obj, { arrayFormat = 'indices' })`

- Walk keys in insertion order and emit `key=value` pairs joined with `&`.
- Nested objects use `parent[child]`.
- Arrays depend on `arrayFormat`:
  - `'indices'` gives `a[0]=x&a[1]=y`;
  - `'brackets'` gives `a[]=x&a[]=y`;
  - `'repeat'` gives `a=x&a=y`.
- Key names and values go through `encodeURIComponent`. Brackets stay literal.
- `undefined` and functions are skipped, and `null` gives `key=`.
- Dates use `toISOString()`, and other values use `String(v)`.
- `parse(stringify(x))` returns `x` for any object whose leaves are strings.
