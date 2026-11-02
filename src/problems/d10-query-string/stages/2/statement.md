Add nesting with brackets, in both directions.

```ts
parse('user[name]=Sam&user[tags][]=a&user[tags][]=b&page=2');
// { user: { name: 'Sam', tags: ['a', 'b'] }, page: '2' }
stringify({ user: { name: 'Sam', tags: ['a', 'b'] } });
// 'user[name]=Sam&user[tags][0]=a&user[tags][1]=b'

type Value = string | Value[] | { [k: string]: Value };
function parse(input: string): Record<string, Value>;
function stringify(obj: Record<string, unknown>, opts?: { arrayFormat?: 'indices' | 'brackets' | 'repeat' }): string;
```

**Keys in `parse`**
- `a[b][c]` is the path `a → b → c`. `[]` is the empty segment `''`.
- A key that starts with `[` or has an unclosed `[` is a plain key: `[x]` and `a[b` stay as they are.
- An index is a non-negative integer without leading zeros (`0`, `7`, `12`).
- Inputs in this stage still don't use `__proto__`, `constructor` or `prototype` as any segment.

**Building the result**
- A container is created when a path first needs one. If the next segment is `''` or an index, it is an array; otherwise it is an object.
- `[]` pushes onto an array.
- An index sets that slot. Arrays come out compacted in index order, so `a[1]=b&a[0]=a` and `a[5]=x` both work.
- A non-index key on an existing array turns it into an object with the indices as keys: `m[0]=z&m[k]=w` gives `{ m: { 0: 'z', k: 'w' } }`.
- **Writing a leaf where a value exists:**
  - a string becomes `[old, new]`;
  - an array gets `new` pushed;
  - an object ignores the pair.
- A nested write whose path runs through a string ignores the pair: `s=1&s[x]=2` gives `{ s: '1' }`.

**`stringify`**
- Nested objects use `parent[child]`. Child keys go through `encodeURIComponent`, but the brackets stay literal.
- Arrays depend on `arrayFormat` (default `'indices'`):
  - `'indices'` gives `a[0]=x&a[1]=y`;
  - `'brackets'` gives `a[]=x&a[]=y`;
  - `'repeat'` gives `a=x&a=y`.
- `parse(stringify(x))` returns `x` for any object whose leaves are strings.
