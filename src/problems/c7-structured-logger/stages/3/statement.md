Add safe serialization, custom serializers and redaction.

```ts
const log = createLogger({
  transports, redact: ['req.headers.authorization', '*.password'],
  serializers: { req: (r) => ({ method: r.method, url: r.url }) },
});

// options, plus:
//   redact?: string[];
//   serializers?: Record<string, (value: any) => unknown>;
export function serializeError(err: Error): Record<string, unknown>;
```

**Safe serialization**, applied to every field value:
- Circular references become `"[Circular]"`. Only true cycles count: the same object appearing twice side by side is fine.
- `bigint` values become strings. Functions and `undefined` are dropped (in arrays they become `null`, as with `JSON.stringify`).
- Objects with `toJSON` use it.
- Any `Error`, at any depth, becomes `serializeError(err)`: `{ type: constructor name, message, stack, ...own enumerable props, cause? }`. The cause is serialized the same way, and an error that is its own cause gets `cause: "[Circular]"`.

**Serializers**
- `serializers[key]` transforms that top-level field before the safe serialization above. It applies to bindings and `base` fields as well as call fields.
- The default `err` serializer is `serializeError`, and a custom `err` serializer replaces it.

**Redaction**
- Redaction runs on the final record. Each path is dotted, and `*` matches any key at that depth.
- Existing values at a matching path become `"[Redacted]"`. Missing paths are left alone, so redaction never adds keys.
- The caller's objects are never mutated.
