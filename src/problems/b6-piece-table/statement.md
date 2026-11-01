# Piece table text buffer

Build the text model behind a code editor. The document can be megabytes long and gets thousands of small edits, so an edit can't copy the whole string.

The classic design is a **piece table**:
- Keep the original text and an append-only "add" buffer.
- Describe the document as a list of pieces, each `(which buffer, start, length)`.
- An edit splits or removes pieces and never rewrites text.

```ts
const buf = new TextBuffer('hello\nworld');
buf.insert(5, ',');            // "hello,\nworld"
buf.positionAt(8);             // { line: 1, col: 1 }
const snap = buf.snapshot();
buf.delete(0, 7);
snap.getText();                // still "hello,\nworld"
```

## API

```ts
type Position = { line: number; col: number };   // both 0-based

class TextBuffer {
  constructor(initial?: string);
  readonly length: number;
  readonly lineCount: number;
  getText(): string;
  insert(offset: number, text: string): void;
  delete(offset: number, length: number): void;
  getLine(line: number): string;                  // without its line break
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
  snapshot(): { readonly length: number; getText(): string };
}
```

## Rules

**Edits**
- Offsets and columns count UTF-16 code units, like `string.length`.
- `insert`/`delete` with an offset outside `0..length` (or not an integer) throw a `RangeError`. `delete` stops at the end of the document if `length` runs past it.
- An edit must never split a surrogate pair. If the edit's start, or the end of a deleted range, falls between the two halves of a pair, throw a `RangeError` and leave the buffer unchanged.

**Lines**
- Line breaks are `\n` and `\r\n`. A lone `\r` is ordinary text.
- `lineCount` is the number of breaks + 1, so an empty buffer has one empty line.
- `getLine(n)` returns the line without its `\n` or `\r\n`. A line number out of range throws a `RangeError`.
- The pieces don't know about lines, so a `\r` and its `\n` may sit in different pieces (for example, typed separately). They're still one `\r\n` break.

**Positions**
- `positionAt(offset)` clamps the offset to `0..length`. If the offset falls inside a line break (between `\r` and `\n`, or on the `\n`), it maps to the end of that line.
- `offsetAt({ line, col })` clamps `line` to the existing lines and `col` to `0..` the line's length (without the break). If `col` lands between the two halves of a surrogate pair, it moves back to the start of the pair.

**Snapshots**
- `snapshot()` must be O(1): don't copy the text or the piece list when you take it.
- Later edits to the buffer must not change what any earlier snapshot returns.

**Performance:** there are timed tests with a multi-megabyte document and thousands of edits, plus 10k random edits checked against a plain string.
