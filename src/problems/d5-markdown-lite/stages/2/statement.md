Add inline formatting to headings and paragraphs (never inside fenced code).

```ts
render('*a **b** c* and `<b>` and snake_case_name');
// '<p><em>a <strong>b</strong> c</em> and <code>&lt;b&gt;</code> and snake_case_name</p>'
```

Scan the text left to right.

- **Backslash escapes:** `\` before an ASCII punctuation character produces that character literally (escaped). Any other `\` is literal.
- **Code spans:** a run of N backticks, up to the next run of exactly N backticks. <!-- tests: code spans -->
  - Output: `<code>escaped</code>`, with no further processing inside. <!-- tests: code spans -->
  - With no closing run, the backticks are literal.
- **Emphasis:** a `**` or `__` pair gives `<strong>`, and a single `*` or `_` pair gives `<em>`. When a run of two or more delimiters opens, it's treated as `**` (or `__`). <!-- tests: emphasis, strong and nesting -->
  - An opener must be followed by a non-space.
  - A closer must be preceded by a non-space.
  - A single-delimiter closer must be a run of exactly one.
  - For `_`, an opener can't follow a letter or digit and a closer can't precede one. So `snake_case_name` stays as it is, while `a*b*c` gives emphasis. <!-- tests: things that are not emphasis -->
  - Emphasis nests: `*a **b** c*` gives `<em>a <strong>b</strong> c</em>`. <!-- tests: emphasis, strong and nesting -->
  - A delimiter with no matching closer is literal text. <!-- tests: things that are not emphasis -->
- Everything else is escaped text.
