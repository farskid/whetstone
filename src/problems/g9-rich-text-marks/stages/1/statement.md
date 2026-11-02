# Rich-text marks

Editors like **ProseMirror** and **Slate** store formatted text as runs of characters that carry **marks**: bold, italic, links and so on. Over the stages you'll build that model. This stage covers `normalize(spans)` and an editor that can add and remove marks.

A `Span` is `{ text, marks }`. A mark is `{ type: 'link', href }`, `{ type: 'color', color }`, or `{ type }` for `bold`, `italic`, `underline` and `code`. Wherever a mark is accepted, a bare type name like `'bold'` works too.

Positions are character offsets into the whole text. A range `from..to` covers the characters `from` up to, but not including, `to`.

```ts
const ed = createEditor([{ text: 'Hello world', marks: [] }]);
ed.addMark(0, 5, 'bold');
ed.getSpans(); // [{ text: 'Hello', marks: [{ type: 'bold' }] }, { text: ' world', marks: [] }]
```

## Rules

- **Normal form.** `normalize` returns new spans:
  - empty spans are dropped;
  - a span keeps one mark per type, and the last one wins;
  - marks are sorted in the order `link`, `color`, `bold`, `italic`, `underline`, `code`;
  - neighbours with equal marks are merged. Two marks are equal when their type and attributes match.
- **Input and output.** Never mutate the input, and don't share mark objects with it.
- **Editor.** `createEditor(initial = [])` starts from the normalized spans. `getSpans()` returns a normalized copy, and `getText()` returns the plain text.
- **`addMark(from, to, mark)`.** Adds the mark to every character in the range, replacing any mark of the same type. Spans split where the range starts and ends.
- **`removeMark(from, to, type)`.** Removes marks of that type, whatever their attributes.
- **Bad ranges.** A range that isn't whole numbers with `0 ≤ from ≤ to ≤ length` throws a `RangeError`. This applies to every method that takes positions. An empty range is valid and changes nothing.

After every change the spans are back in normal form, so neighbours that end up alike merge again.
