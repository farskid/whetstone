# Schema validation: refine, transform, lazy

Add custom checks, output transforms and recursive schemas.

```ts
const Pw = s.object({ pw: s.string().min(8), confirm: s.string() })
  .refine((v) => v.pw === v.confirm, 'Passwords do not match')
  .transform((v) => v.pw);
Pw.parse({ pw: 'longenough', confirm: 'longenough' }); // 'longenough'

const Node = s.object({ name: s.string(), children: s.array(s.lazy(() => Node)).default(() => []) });
```

```ts
// every schema: .refine(pred, message?) / .transform(fn)
lazy(get: () => Schema): Schema;
```

| check | code | message |
|---|---|---|
| `.refine` false | `custom` | the given message, or `Invalid input` |

**`.refine` / `.transform`**
- They run only if the inner schema produced **no issues**. Otherwise the predicate or function is not called at all.
- `refine(pred)` adds a `custom` issue at the current path when `pred(output)` is false.
- `transform(fn)` replaces the output with `fn(output)`.
- Chains run in order, so a `refine` after a `transform` sees the transformed value.
- Inside a union, the winning option's transformed output is returned.

**Lazy.** `s.lazy(() => Node)` calls `get` when it first parses, so a schema can refer to itself and recursive structures work. Paths keep growing through the recursion.

Everything from earlier stages still applies.
