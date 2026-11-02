# Schema validation: objects and arrays

Add `s.object(shape)` and `s.array(item)`, collecting every issue with its path.

```ts
const User = s.object({ name: s.string().min(1), address: s.object({ city: s.string() }) });
User.safeParse({ name: '', address: {} });
// issues: name too_small …, address.city invalid_type: Expected string, received undefined
User.parse({ name: 'Ada', address: { city: 'Oslo' }, extra: 1 }); // { name: 'Ada', address: { city: 'Oslo' } }
```

```ts
array(item: Schema): ArraySchema;                    // .min(n) .max(n)
object(shape: Record<string, Schema>): Schema;
```

| check | code | message |
|---|---|---|
| array `.min(n)` / `.max(n)` | `too_small` / `too_big` | `Array must contain at least n element(s)` / `Array must contain at most n element(s)` |

**Paths.** A nested issue's path is the list of keys and array indices from the root, such as `['list', 1, 'v']`. The error message joins them with `.`, as in `list.1.v: …`.

**Objects**
- Only plain objects pass. Arrays and `null` are `invalid_type` (`received array` / `received null`).
- Validate each shape key in shape order and collect **every** issue. Don't stop at the first.
- A missing key is `undefined`, so it fails unless its schema accepts `undefined`.
- Unknown keys are **stripped**. They are not copied to the output.

**Arrays**
- Check every item, with index paths. Then run the length checks on the array.
- If the array isn't an array, report only `invalid_type`.

**Output.** Objects and arrays are always **new** values, never the input reference.

Everything from earlier stages still applies.
