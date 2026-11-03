# Schema validation: modifiers

Add `.optional()`, `.nullable()`, `.default()`, `s.union`, and the unknown-key modes of objects.

```ts
const Settings = s.object({
  role: s.enum(['admin', 'user']).default('user'),
  nick: s.string().optional(),
}).strict();
Settings.parse({});              // { role: 'user' }   (nick stays absent)
Settings.safeParse({ x: 1 });    // (root) unrecognized_keys: Unrecognized key(s): "x"
```

```ts
// every schema: .optional() / .nullable() / .default(v | () => v)
union(options: Schema[]): Schema;
// object schemas: .strict() / .passthrough() / .extend(shape)
```

| check | code | message |
|---|---|---|
| `.strict()` extra keys | `unrecognized_keys` | `Unrecognized key(s): "x", "y"` (keys as JSON, input order, at the object's path) <!-- tests: objects: unknown keys stripped by default; strict reports; passthrough keeps; output is a new object --> |
| union, all options failed | `invalid_union` | `Invalid input` <!-- tests: union: first succeeding option wins; all fail → one invalid_union issue --> |

**Modifiers**
- `.optional()` also accepts `undefined`, and `.nullable()` also accepts `null`. Anything else goes to the inner schema. <!-- tests: optional, nullable, and absent optional keys stay absent -->
- `.default(v)` replaces `undefined` with `v`, or with `v()` if `v` is a function, called on every parse. The result is then parsed by the inner schema. `null` is not replaced. <!-- tests: default: replaces undefined (value or factory) and is parsed by the inner schema -->
- An object key that is **absent** from the input and comes out `undefined` stays absent from the output. A key that is present with the value `undefined` is kept. <!-- tests: optional, nullable, and absent optional keys stay absent -->

**Unknown keys**
- Unknown keys are stripped by default. <!-- tests: objects: unknown keys stripped by default; strict reports; passthrough keeps; output is a new object -->
- `.strict()` reports them as one issue. <!-- tests: objects: unknown keys stripped by default; strict reports; passthrough keeps; output is a new object -->
- `.passthrough()` copies them after the shape keys. <!-- tests: objects: unknown keys stripped by default; strict reports; passthrough keeps; output is a new object -->
- `extend(shape)` returns a new object schema that has the extra or overriding keys and keeps the unknown-key mode. <!-- tests: extend adds/overrides keys and keeps the unknown-key mode -->
- Each method returns a new schema and leaves the original unchanged.

**Union.** Try the options in order and use the first one that succeeds, with its output. Issues from the failed options are not reported. If all options fail, report a single `invalid_union` issue. <!-- tests: union: first succeeding option wins; all fail → one invalid_union issue -->

Everything from earlier stages still applies.
