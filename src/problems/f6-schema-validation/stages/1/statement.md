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
- `parse` returns the value, or throws a `ValidationError` holding all the issues. <!-- tests: parse throws ValidationError with issues and a readable message; safeParse never throws -->
- The error's `message` lists the issues, one per line, as `path: message`. Paths are joined with `.`, and the root path is written `(root)`. In this stage every path is `[]`, so every line starts with `(root): `. <!-- tests: parse throws ValidationError with issues and a readable message; safeParse never throws -->
- `safeParse` never throws. It returns `{ success: true, data }` or `{ success: false, error }`. <!-- tests: parse throws ValidationError with issues and a readable message; safeParse never throws -->

**Type names** (used for `received`): `string`, `number`, `boolean`, `undefined`, `null`, `array`, `object`, `function`, `bigint`, `symbol`, and `nan` for `NaN`. `NaN` is not a valid number. <!-- tests: NaN is not a number -->

| check | code | message |
|---|---|---|
| wrong type | `invalid_type` | `Expected string, received number` <!-- tests: primitives: parse returns the value, wrong type → invalid_type --> |
| `.int()` on a non-integer | `invalid_type` | `Expected integer, received float` <!-- tests: number checks: min, max, int --> |
| string `.min(n)` / `.max(n)` | `too_small` / `too_big` | `String must contain at least n character(s)` / `String must contain at most n character(s)` <!-- tests: string checks: all failing checks reported in chain order; wrong type skips checks --> |
| number `.min(n)` / `.max(n)` | `too_small` / `too_big` | `Number must be greater than or equal to n` / `Number must be less than or equal to n` <!-- tests: number checks: min, max, int --> |
| `.regex(re)` | `invalid_string` | `Invalid` |
| literal | `invalid_literal` | `Expected <JSON of value>` <!-- tests: literal and enum --> |
| enum | `invalid_enum` | `Expected "a" \| "b", received "c"` (values and the input as JSON) <!-- tests: literal and enum --> |

**Checks**
- A wrong type reports only `invalid_type`, and the checks are skipped. <!-- tests: string checks: all failing checks reported in chain order; wrong type skips checks -->
- If the type is right, **all** failing checks are reported, in the order they were chained. <!-- tests: string checks: all failing checks reported in chain order; wrong type skips checks -->
- `.regex` must give the same answer every time, even for a global (`/g`) regex.
- `literal` and `enum` compare with `===`. <!-- tests: literal and enum -->

**Immutability.** Every chain method returns a new schema. `const a = s.string(); a.min(3)` leaves `a` unchanged. <!-- tests: schemas are immutable -->
