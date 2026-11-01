# Spreadsheet formulas

Build a small spreadsheet engine in the spirit of HyperFormula.

```ts
const s = createSheet();
s.set('A1', 2);
s.set('A2', '3');
s.set('A3', '=A1*A2+1');      // ['A3']
s.set('B1', '=SUM(A1:A3)');   // ['B1']
s.set('A1', 4);               // ['A1', 'B1', 'A3']  (row-major order)
s.get('B1');                  // 20
```

## API

- `set(address, input)` stores a cell's input and recalculates.
  - It returns the addresses whose **value changed** (including the cell itself), normalized to uppercase and sorted by row, then column.
- `get(address)` returns the cell's current value, or `null` for an empty cell.
- `define(name, fn)` registers a custom function (case-insensitive) and recalculates every formula.
- Addresses are column letters (`A`…`Z`, `AA`…) plus a row starting at 1. They're case-insensitive in the API and in formulas.
  - An invalid address passed to `set` or `get` throws `Invalid address: <address>`.

## Inputs

- A number is stored as that number.
- A string is interpreted by its form:
  - starting with `=`, it's a formula;
  - matching `-?\d+(\.\d+)?` (surrounding spaces allowed), it's a number;
  - empty or whitespace only, it clears the cell;
  - anything else is text.

## Formulas

**Literals and references**
- Literals: numbers, `"strings"` (`""` escapes a quote), `TRUE` and `FALSE`.
- References: `A1`, and ranges `A1:B3` (any two corners; cells in row-major order).
- An empty cell's value is `null`.

**Precedence**, from lowest to highest:
1. comparisons `= <> < > <= >=`
2. `&`
3. `+ -`
4. `* /`
5. unary `-` and `+`

All binary operators are left-associative, and parentheses group.

**Coercion**
- Arithmetic:
  - numbers are used as they are;
  - booleans become 1/0;
  - `null` becomes 0;
  - text gives `#VALUE!`.
- `&` concatenates text:
  - numbers use `String(n)`;
  - booleans become `TRUE`/`FALSE`;
  - `null` becomes `""`.
- Comparisons:
  - `null` takes the other side's empty value (`0`, `""` or `FALSE`);
  - text compares case-insensitively;
  - values of different types order as number < text < boolean.

**Errors**
- Errors are values: `{ error: code }`.
- An operand that is an error makes the result that error, checking left operand first.
- `x/0` gives `#DIV/0!`.
- An unknown name or function gives `#NAME?`.
- A range used outside a function argument gives `#VALUE!`.
- A formula that doesn't parse (including references like `A0`) gives `#ERROR!`.

## Functions

**`SUM`, `AVERAGE`, `MIN`, `MAX`**
- A reference or range argument contributes only its number cells. Text, booleans and empty cells are skipped, but an error cell propagates.
- Any other argument is coerced like arithmetic.
- With no numbers, `MIN` and `MAX` return 0 and `AVERAGE` returns `#DIV/0!`.

**`COUNT`** counts number values among its arguments and the cells they reference. It ignores everything else, errors included.

**`IF(cond, then, else?)`**
- The condition is coerced to boolean:
  - numbers are true when non-zero;
  - `null` is false;
  - text gives `#VALUE!`.
- `IF` evaluates **only the chosen branch**. A missing else gives `FALSE`, and a wrong argument count gives `#VALUE!`.

**`CONCAT(...)`** joins its arguments and the cells they reference as text.

**Custom functions**
- A custom function receives each argument as a value, except a range, which arrives as an array of values.
- If any argument (or any range cell) is an error, the function isn't called and that error is the result.
- A function that throws, or returns a non-finite number, gives `#VALUE!`.

## Recalculation

- A formula depends on every cell its text references, **including both branches of an `IF`**.
- After a `set`, recalculate that cell and everything that depends on it, directly or indirectly, in dependency order:
  - each formula evaluates **at most once** per `set`;
  - no formula ever sees a stale input;
  - cells outside that set aren't touched.
- Cells that are on a dependency cycle, or that depend on one, get `#CYCLE!`. Breaking the cycle brings real values back.
