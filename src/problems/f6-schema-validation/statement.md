# Schema validation

Build a runtime validator in the style of **Zod**. Schemas are immutable, chainable values. `parse` either returns a **new**, cleaned value or throws an error that lists **every** problem along with its path.

```ts
const User = s.object({
  name: s.string().min(1),
  age: s.number().int().min(0).optional(),
  role: s.enum(['admin', 'user']).default('user'),
  tags: s.array(s.string()).max(5),
});

User.parse({ name: 'Ada', tags: [], extra: 1 }); // { name: 'Ada', role: 'user', tags: [] }
User.safeParse({ name: '', tags: [1] });
// { success: false, error: ValidationError { issues: [
//   { path: ['name'], code: 'too_small', message: 'String must contain at least 1 character(s)' },
//   { path: ['tags', 0], code: 'invalid_type', message: 'Expected string, received number' } ] } }
```

> v1 is **runtime only**. Type inference (`Infer<typeof User>`) is a later stage.

## API

```ts
export const s: {
  string(): StringSchema;      // .min(n) .max(n) .regex(re)
  number(): NumberSchema;      // .min(n) .max(n) .int()
  boolean(): Schema;
  literal(value: string | number | boolean | null): Schema;
  enum(values: readonly (string | number)[]): Schema;
  array(item: Schema): ArraySchema;     // .min(n) .max(n)
  object(shape: Record<string, Schema>): ObjectSchema; // .strict() .passthrough() .extend(shape)
  union(options: Schema[]): Schema;
  lazy(get: () => Schema): Schema;
};
// every schema:
//   .parse(input) / .safeParse(input) / .optional() / .nullable() / .default(v | () => v)
//   .refine(pred, message?) / .transform(fn)
class ValidationError extends Error { issues: Issue[] }   // name 'ValidationError'
interface Issue { path: (string | number)[]; code: string; message: string }
```

## Rules

**Parsing**
- `parse` returns the output or throws a `ValidationError` holding all the issues.
- Its `message` is the issues, one per line, as `path: message`. The path is joined with `.`, and the root path is written `(root)`.
- `safeParse` never throws. It returns `{ success: true, data }` or `{ success: false, error }`.
- Collect **every** issue in document order. Don't stop at the first one.

**Type names** (for `received`): `string`, `number`, `boolean`, `undefined`, `null`, `array`, `object`, `function`, `bigint`, `symbol`, and `nan` for `NaN`.

| check | code | message |
|---|---|---|
| wrong type | `invalid_type` | `Expected string, received number` |
| `.int()` on a non-integer | `invalid_type` | `Expected integer, received float` |
| string `.min(n)` / `.max(n)` | `too_small` / `too_big` | `String must contain at least n character(s)` / `at most n character(s)` |
| number `.min(n)` / `.max(n)` | `too_small` / `too_big` | `Number must be greater than or equal to n` / `less than or equal to n` |
| array `.min(n)` / `.max(n)` | `too_small` / `too_big` | `Array must contain at least n element(s)` / `at most n element(s)` |
| `.regex(re)` | `invalid_string` | `Invalid` |
| literal | `invalid_literal` | `Expected <JSON of value>` |
| enum | `invalid_enum` | `Expected "a" \| "b", received "c"` (values and the input as JSON) |
| `.strict()` extra keys | `unrecognized_keys` | `Unrecognized key(s): "x", "y"` (at the object's path) |
| union, all options failed | `invalid_union` | `Invalid input` |
| `.refine` false | `custom` | the given message, or `Invalid input` |

**Checks**
- A wrong type reports only `invalid_type`, and the checks are skipped.
- If the type is right, **all** failing checks are reported, in the order they were chained. `NaN` is not a valid number.

**Objects**
- Validate each shape key in shape order. A missing key is `undefined`, so it fails unless the schema accepts `undefined`.
- Unknown keys are **stripped** by default. `.strict()` reports them. `.passthrough()` copies them after the shape keys.
- An `.optional()` key that is absent from the input stays absent from the output.
- `extend(shape)` returns a new object schema with the extra or overriding keys, and keeps the unknown-key mode.

**Arrays.** The item issues come first, with index paths. Then the length checks.

**Output.** Objects and arrays are always **new** values, never the input reference.

**Modifiers**
- `.optional()` accepts `undefined`. `.nullable()` accepts `null`.
- `.default(v)` replaces `undefined` with `v`, or `v()` if it's a function, and then parses the result with the inner schema.

**Union.** Try the options in order and use the first that succeeds. Issues from the failed options are not reported.

**`.refine` / `.transform`**
- They run only if the inner schema produced **no issues**.
- `refine` adds a `custom` issue at the current path.
- `transform(fn)` maps the output. Chains run in order.

**Lazy.** `s.lazy(() => Node)` lets a schema refer to itself, so recursive structures work.

**Immutability.** Every chain method returns a new schema. `const a = s.string(); a.min(3)` leaves `a` unchanged.
