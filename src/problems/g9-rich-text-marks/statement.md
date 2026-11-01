# Rich-text marks

Editors like **ProseMirror** and **Slate** store formatted text as runs of characters that carry **marks**: bold, italic, links and so on. Build that model: `normalize(spans)`, `toHTML(spans)`, `parseHTML(html)` and `createEditor(initial?)`.

A `Span` is `{ text, marks }`. A mark is `{ type: 'link', href }`, `{ type: 'color', color }`, or `{ type }` for `bold`, `italic`, `underline` and `code`. Wherever a mark is accepted, a bare type name like `'bold'` works too.

Positions are character offsets into the whole text. A range `from..to` covers the characters `from` up to, but not including, `to`.

## Spans and marks

- **Normal form.** `normalize` returns new spans:
  - empty spans are dropped;
  - a span keeps one mark per type, and the last one wins;
  - marks are sorted in the order `link`, `color`, `bold`, `italic`, `underline`, `code`;
  - neighbours with equal marks are merged. Two marks are equal when their type and attributes match.
- **Input and output.** Never mutate the input, and don't share mark objects with it.
- **Editor.** `createEditor(initial)` starts from the normalized spans. `getSpans()` returns a normalized copy, and `getText()` returns the plain text.
- **`addMark(from, to, mark)`.** Adds the mark to every character in the range, replacing any mark of the same type. Spans split where the range starts and ends.
- **`removeMark(from, to, type)`.** Removes marks of that type, whatever their attributes.
- **Bad ranges.** A range that isn't whole numbers with `0 ≤ from ≤ to ≤ length` throws a `RangeError`. This applies to every method that takes positions. An empty range is valid and changes nothing.

## Toggle and normalize

- **`toggleMark(from, to, mark)`.** If every character in the range already has an equal mark, remove marks of that type. Otherwise, add the mark to the whole range.
- **Staying normal.** After every change, the spans are back in normal form, so neighbours that end up alike merge again.
- **`deleteText(from, to)`.** Removes the characters in the range.

## Typing

- **`insertText(pos, text)`.** Typed text gets `marksAt(pos)`.
- **`marksAt(pos)`.** The marks of the character before `pos`. At position 0 it uses the first character instead, and in an empty document it returns no marks.
- **Links aren't inclusive.** A link carries over only when the characters on **both** sides of `pos` have that same link. Typing just after or just before a link doesn't extend it.
- **Stored marks.** A collapsed `toggleMark(pos, pos, mark)` changes no text. Instead it toggles the mark in a set of stored marks for `pos`, starting from `marksAt(pos)`.
  - While the stored marks are set, `marksAt(pos)` returns them.
  - Text typed at `pos` gets them.
  - Typing, deleting, or calling `addMark`, `removeMark` or a ranged `toggleMark` clears them, so they're used only once. Another collapsed toggle at a different position replaces them.

## Attributes and HTML

- **Tags.** The marks become these tags:

  | Mark | Tag |
  |---|---|
  | link | `<a href="…">` |
  | color | `<span style="color: …">` |
  | bold | `<strong>` |
  | italic | `<em>` |
  | underline | `<u>` |
  | code | `<code>` |
- **Nesting.** Tags nest in the mark order above, outermost first. Adjacent spans share their open outer tags: `<strong>a<em>b</em></strong>`, not two separate `<strong>` tags. Tags with different attributes aren't shared.
- **Escaping.** In text, escape `&`, `<` and `>`. Attributes escape `"` as well.
- **`parseHTML(html)`.** Reads that HTML back into normalized spans, so `parseHTML(toHTML(spans))` equals `normalize(spans)`. It also handles these cases:
  - tag names in any case, plus `<b>` and `<i>` as aliases;
  - unknown tags like `<p>`, whose text is kept and whose tag is ignored;
  - the entities `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`, each decoded exactly once;
  - a closing tag closes everything opened inside it.
