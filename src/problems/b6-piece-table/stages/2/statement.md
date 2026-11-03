Add lines and positions. For now the only line break is `\n`.

```ts
type Position = { line: number; col: number };   // both 0-based

class TextBuffer {
  // ...stage 1, plus:
  readonly lineCount: number;
  getLine(line: number): string;                  // without its '\n'
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
}
```

- `lineCount` is the number of breaks + 1, so an empty buffer has one empty line, and a trailing `\n` adds an empty last line. <!-- tests: an empty buffer has one empty line | lineCount and getLine follow edits -->
- `getLine(n)` returns the line without its break. A line number out of range (or not an integer) throws a `RangeError`. <!-- tests: lineCount and getLine follow edits -->
- `positionAt(offset)` clamps the offset to `0..length`. An offset on a `\n` maps to the end of that line. <!-- tests: positionAt and offsetAt round-trip and clamp -->
- `offsetAt({ line, col })` clamps `line` to the existing lines and `col` to `0..` the line's length (without the break). <!-- tests: positionAt and offsetAt round-trip and clamp -->
- Track line breaks per piece as you edit, so `lineCount` doesn't rescan the text. The last stage has timed tests.
