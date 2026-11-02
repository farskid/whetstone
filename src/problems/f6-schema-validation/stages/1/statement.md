# Schema validation

You'll build a runtime validator in the style of **Zod**. This stage covers primitive schemas.

```ts
const Name = s.string().min(3).regex(/^[a-z]+$/);
Name.parse('ada');          // 'ada'
Name.safeParse('A');
// { success: false, error: ValidationError { issues: [
//   { path: [], code: 'too_small', message: 'String must contain at least 3 character(s)' },
//   { path: [], code: 'invalid_string', message: 'Invalid' } ] } }
```

```ts
export const s: {
  string(): StringSchema;   // .min(n) .max(n) .regex(re)
  number(): NumberSchema;   // .min(n) .max(n) .int()
  boolean(): Schema;
  literal(value: string | number | boolean | null): Schema;
  enum(values: readonly (string | number)[]): Schema;
};
// every schema: .parse(input) / .safeParse(input)
class ValidationError extends Error { issues: Issue[] }   // name 'ValidationError'
interface Issue { path: (string | number)[]; code: string; message: string }
```

**Parsing**
- `parse` returns the value, or throws a `ValidationError` holding all the issues.
- The error's `message` lists the issues, one per line, as `path: message`. Paths are joined with `.`, and the root path is written `(root)`. In this stage every path is `[]`, so every line starts with `(root): `.
- `safeParse` never throws. It returns `{ success: true, data }` or `{ success: false, error }`.

**Type names** (used for `received`): `string`, `number`, `boolean`, `undefined`, `null`, `array`, `object`, `function`, `bigint`, `symbol`, and `nan` for `NaN`. `NaN` is not a valid number.

| check | code | message |
|---|---|---|
| wrong type | `invalid_type` | `Expected string, received number` |
| `.int()` on a non-integer | `invalid_type` | `Expected integer, received float` |
| string `.min(n)` / `.max(n)` | `too_small` / `too_big` | `String must contain at least n character(s)` / `String must contain at most n character(s)` |
| number `.min(n)` / `.max(n)` | `too_small` / `too_big` | `Number must be greater than or equal to n` / `Number must be less than or equal to n` |
| `.regex(re)` | `invalid_string` | `Invalid` |
| literal | `invalid_literal` | `Expected <JSON of value>` |
| enum | `invalid_enum` | `Expected "a" \| "b", received "c"` (values and the input as JSON) |

**Checks**
- A wrong type reports only `invalid_type`, and the checks are skipped.
- If the type is right, **all** failing checks are reported, in the order they were chained.
- `.regex` must give the same answer every time, even for a global (`/g`) regex.
- `literal` and `enum` compare with `===`.

**Immutability.** Every chain method returns a new schema. `const a = s.string(); a.min(3)` leaves `a` unchanged.
