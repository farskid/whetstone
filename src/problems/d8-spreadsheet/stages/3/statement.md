Keep computed values and recalculate only what a change affects. Also add custom functions.

```ts
s.set('A1', 2);               // ['A1']
s.set('A2', '3');             // ['A2']
s.set('A3', '=A1*A2+1');      // ['A3']
s.set('B1', '=SUM(A1:A3)');   // ['B1']
s.set('A1', 4);               // ['A1', 'B1', 'A3']  (row-major order)

type CustomFunction = (...args: (Value | Value[])[]) => number | string | boolean | null;
// Sheet.set now returns string[]; Sheet gains define(name: string, fn: CustomFunction): void
```

**Recalculation**
- `set` now returns the addresses whose **value changed** (including the cell itself), normalized to uppercase and sorted by row, then column. A cell whose value stays the same isn't listed; two errors with the same code count as the same value. <!-- tests: dependents update and set returns changed cells in row-major order -->
- A formula depends on every cell its text references, **including both branches of an `IF`** and every cell of a range.
- After a `set`, recalculate that cell and everything that depends on it, directly or indirectly, in dependency order: <!-- tests: dependents update and set returns changed cells in row-major order | each formula evaluates once per set, never with stale inputs -->
  - each formula evaluates **at most once** per `set`; <!-- tests: each formula evaluates once per set, never with stale inputs -->
  - no formula ever sees a stale input; <!-- tests: each formula evaluates once per set, never with stale inputs -->
  - cells outside that set aren't touched.
- Replacing a formula drops its old dependencies.
- You may still assume there are no cycles.

**Custom functions**
- `define(name, fn)` registers a custom function (case-insensitive) and recalculates every formula. <!-- tests: custom functions: args, ranges, errors, late definition -->
- Built-ins take precedence over custom functions with the same name. An unknown function still gives `#NAME?`.
- A custom function receives each argument as a value, except a range, which arrives as an array of values. <!-- tests: custom functions: args, ranges, errors, late definition -->
- If any argument (or any range cell) is an error, the function isn't called and that error is the result. <!-- tests: custom functions: args, ranges, errors, late definition -->
- A function that throws, or returns a non-finite number, gives `#VALUE!`.
