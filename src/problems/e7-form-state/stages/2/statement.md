# Form state manager: validation

Add field validators, async validators and a form-level validator.

```ts
const form = createForm({
  initialValues: { name: '', items: [{ title: 'x' }, { title: '' }] },
  validate: (v) => (v.pw !== v.confirm ? { confirm: 'Must match' } : {}),
  fields: {
    name: { validate: (v) => (v ? undefined : 'Required'), asyncValidate: checkTaken },
    'items.*.title': { validate: (v) => (v ? undefined : 'Required') },
  },
});
form.errors; // { name: 'Required', 'items.1.title': 'Required' }
```

```ts
interface FieldConfig {
  validate?: (value: any, values: Values) => string | undefined;
  asyncValidate?: (value: any, values: Values) => Promise<string | undefined>;
}
// options gain:  validate?: (values) => Errors;  fields?: Record<string, FieldConfig>
// Form gains:    readonly errors: Errors;  readonly isValid: boolean
```

- `errors` is an object keyed by **index path**, such as `'items.1.title'`. Only paths with an error appear. It is recomputed from the current values each time you read it.
- `fields` is keyed by patterns, where `*` matches exactly one path segment. A config applies to every path in `values` that it matches.
- Each path's error is the first that applies, in this order:
  1. The field's sync `validate(value, values)`.
  2. The field's latest async result.
  3. The form-level `validate(values)`, which returns an `{ path: message }` object.
- `isValid` means `errors` is empty.

**Async checks**
- `setValue` on a path whose field has `asyncValidate` drops that path's previous async error and starts a new check right away.
- The check resolves to a message or `undefined`. A rejection counts as an error, using the rejection's `message` (or `String(reason)` if it is not an `Error`).
- Only the latest check for a path counts. A result from an older check arriving later is ignored.
- `setValue` that replaces an object or array drops async errors under it.
- `reset` also clears async results, and results of checks started before it are ignored.
