# Rich-text marks: HTML

Add HTML output and a parser that reads it back.

```ts
toHTML([{ text: 'a', marks: [{ type: 'bold' }] }, { text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }] }]);
// '<strong>a<em>b</em></strong>'
```

`toHTML(spans)` normalizes the spans first, and the editor's `toHTML()` serializes its current spans.

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

Everything from earlier stages still applies.
