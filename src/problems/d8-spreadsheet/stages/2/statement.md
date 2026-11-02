Add ranges and built-in functions.

```ts
s.set('A1', 1); s.set('A2', 'two'); s.set('A3', 3);
s.set('B1', '=SUM(A1:A3)');                 // 4 (text is skipped)
s.set('B2', '=IF(A1>0, "pos", 1/0)');       // 'pos'
```

**Syntax**
- Ranges `A1:B3`: any two corners. Cells are taken in row-major order.
- Calls `NAME(arg, ...)`, with zero or more arguments. Names are case-insensitive.
- A range used outside a function argument gives `#VALUE!`.
- An unknown function gives `#NAME?`.
- A malformed call or range (`SUM(1,)`, `A1:`) gives `#ERROR!`.

**`SUM`, `AVERAGE`, `MIN`, `MAX`**
- A reference or range argument contributes only its number cells. Text, booleans and empty cells are skipped, but an error cell propagates.
- Any other argument is coerced like arithmetic.
- With no numbers, `MIN` and `MAX` return 0 and `AVERAGE` returns `#DIV/0!`.

**`COUNT`** counts number values among its arguments and the cells they reference. It ignores everything else, errors included.

**`IF(cond, then, else?)`**
- The condition is coerced to boolean:
  - numbers are true when non-zero;
  - `null` is false;
  - text gives `#VALUE!`;
  - an error gives that error.
- `IF` evaluates **only the chosen branch**. A missing else gives `FALSE`, and a wrong argument count gives `#VALUE!`.

**`CONCAT(...)`** joins its arguments and the cells they reference as text, like `&`. An error value gives that error.
