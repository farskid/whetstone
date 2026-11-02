Build the text model behind a code editor. The document can be megabytes long and gets thousands of small edits, so an edit can't copy the whole string.

The classic design is a **piece table**:
- Keep the original text and an append-only "add" buffer.
- Describe the document as a list of pieces, each `(which buffer, start, length)`.
- An edit splits or removes pieces and never rewrites text.

```ts
const buf = new TextBuffer('hello world');
buf.insert(5, ',');     // "hello, world"
buf.delete(0, 7);       // "world"
buf.length;             // 5
```

```ts
class TextBuffer {
  constructor(initial?: string);   // default ''
  readonly length: number;
  getText(): string;
  insert(offset: number, text: string): void;
  delete(offset: number, length: number): void;
}
```

- Offsets count UTF-16 code units, like `string.length`. Insert at `0` prepends and at `length` appends.
- `insert`/`delete` with an offset outside `0..length`, or one that isn't an integer, throw a `RangeError` and change nothing.
- `delete` stops at the end of the document if `length` runs past it. Deleting 0 characters, or inserting `''`, does nothing.
- A delete can span many pieces.
