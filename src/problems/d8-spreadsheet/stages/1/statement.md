Build a small spreadsheet engine in the spirit of HyperFormula. Start with cells and formulas made of literals, references and operators.

```ts
const s = createSheet();
s.set('A1', 4);
s.set('B1', '=-A1*2+1');      // formula
s.set('B2', '="n: "&A1');     // text
s.get('B1');                  // -7
s.get('B2');                  // 'n: 4'
```

```ts
type ErrorCode = '#DIV/0!' | '#VALUE!' | '#NAME?' | '#ERROR!';
interface CellError { error: ErrorCode }
type Value = number | string | boolean | null | CellError;
interface Sheet {
  set(address: string, input: string | number): void;
  get(address: string): Value;
}
function createSheet(): Sheet;
```

**API**
- `set(address, input)` stores a cell's input.
- `get(address)` returns the cell's current value, or `null` for an empty cell. A formula's value always reflects the current inputs of the cells it references.
- Addresses are column letters (`A`…`Z`, `AA`…) plus a row starting at 1. They're case-insensitive in the API and in formulas.
  - An invalid address passed to `set` or `get` throws `Invalid address: <address>`.
- In this stage no formula refers to itself, directly or indirectly.

**Inputs**
- A number is stored as that number. <!-- tests: inputs: numbers, numeric strings, text, clearing -->
- A string is interpreted by its form: <!-- tests: inputs: numbers, numeric strings, text, clearing -->
  - starting with `=`, it's a formula;
  - matching `-?\d+(\.\d+)?` (surrounding spaces allowed), it's a number;
  - empty or whitespace only, it clears the cell;
  - anything else is text.

**Formula syntax**
- Literals: numbers (`\d+(\.\d+)?`), `"strings"` (`""` escapes a quote), `TRUE` and `FALSE` (case-insensitive).
- References like `A1`. An empty cell's value is `null`. <!-- tests: precedence, unary minus and references -->
- Precedence, from lowest to highest: <!-- tests: precedence, unary minus and references -->
  1. comparisons `= <> < > <= >=`
  2. `&`
  3. `+ -`
  4. `* /`
  5. unary `-` and `+`
- All binary operators are left-associative, and parentheses group.

**Coercion**
- Arithmetic:
  - numbers are used as they are;
  - booleans become 1/0;
  - `null` becomes 0;
  - text gives `#VALUE!`.
- `&` concatenates text: <!-- tests: text, booleans, & and comparisons -->
  - numbers use `String(n)`;
  - booleans become `TRUE`/`FALSE`;
  - `null` becomes `""`.
- Comparisons: <!-- tests: text, booleans, & and comparisons -->
  - `null` takes the other side's empty value (`0`, `""` or `FALSE`);
  - text compares case-insensitively;
  - values of different types order as number < text < boolean.

**Errors**
- Errors are values: `{ error: code }`.
- An operand that is an error makes the result that error, checking the left operand first. A reference to an error cell gives that error.
- `x/0` gives `#DIV/0!`.
- Any other name (like `NOPE`) gives `#NAME?`.
- A formula that doesn't parse gives `#ERROR!`. That includes references like `A0`, and (in this stage) function calls and ranges.
