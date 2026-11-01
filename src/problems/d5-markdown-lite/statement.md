# Markdown lite

Write `render(markdown)`, which turns a Markdown subset into HTML in the spirit of `marked`. This isn't full CommonMark. The rules below are the whole spec, and the output must match them exactly.

```ts
render('# Hi *there*\n\n- one\n- two\n  - nested');
// <h1>Hi <em>there</em></h1>
// <ul>
// <li>one</li>
// <li>two
// <ul>
// <li>nested</li>
// </ul>
// </li>
// </ul>
```

## General

- Normalize `\r\n` and `\r` to `\n`.
- Rendered blocks are joined with `\n`, with no trailing newline.
- Blank lines (only whitespace) separate blocks and produce nothing.
- Escape all text as `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`. Raw HTML is **not** supported; it's just text.

## Blocks

Block markers must start at column 0, except list markers, which may be indented.

**Fenced code.** A line matching `` ```lang `` (where `lang` is optional `[\w+-]*`) opens a fence.
- The fence runs until a line that is just ```` ``` ```` (trailing spaces allowed), or until the end of the input.
- Output: `<pre><code class="language-lang">…</code></pre>`. Leave out the class when there is no lang.
- Each content line is escaped and followed by `\n`.
- No inline processing happens inside the fence.

**Headings.** One to six `#`, then a space or tab, then the text.
- Output: `<hN>inline</hN>`.
- The text is trimmed.
- `#` alone gives an empty heading.
- `#text` with no space is **not** a heading.

**Blockquotes.** Consecutive lines starting with `>`.
- Strip `>` plus one optional space from each line.
- Render the result as blocks: `<blockquote>\n…\n</blockquote>`.
- Quotes nest.

**Lists.** A list item line is `indent marker space text`. The marker is `-`, `*` or `+` for `<ul>`, or `N.` for `<ol>`.
- A list continues while lines are items with the **same indent and the same kind** (ordered or unordered). A different kind starts a new list.
- After an item line, the following non-blank lines indented at least `indent + 2` belong to that item. Remove their smallest common indentation and render them as blocks after the item's text.
- Item output:
  - `<li>text</li>`;
  - `<li>text\n…children…\n</li>` when the item has nested content.
- List output: `<ul>\n…items…\n</ul>`. An ordered list whose first number isn't 1 gets `<ol start="N">`.
- A blank line or any other line ends the list.

**Paragraphs.** Anything else.
- A paragraph keeps consecutive non-blank lines until one starts a fence, heading, blockquote or list item.
- Each line is trimmed, and lines are joined with `\n`.
- Output: `<p>inline</p>`.

## Inline

Scan left to right.

- **Backslash escapes:** `\` before an ASCII punctuation character produces that character literally (escaped). Any other `\` is literal.
- **Code spans:** a run of N backticks, up to the next run of exactly N backticks.
  - Output: `<code>escaped</code>`, with no further processing inside.
  - With no closing run, the backticks are literal.
- **Emphasis:** a `**` pair gives `<strong>` and a single `*` or `_` pair gives `<em>`. When a run of two or more delimiters opens, it's treated as `**` (or `__`).
  - An opener must be followed by a non-space.
  - A closer must be preceded by a non-space.
  - A single-delimiter closer must be a run of exactly one.
  - For `_`, an opener can't follow a letter or digit and a closer can't precede one. So `snake_case_name` stays as it is, while `a*b*c` gives emphasis.
  - Emphasis nests: `*a **b** c*` gives `<em>a <strong>b</strong> c</em>`.
  - A delimiter with no matching closer is literal text.
- **Links:** `[text](url)`.
  - Brackets in the text nest, and the URL runs to the first `)`.
  - A URL containing whitespace isn't a link.
  - Render the text as inline content, without links inside links.
  - Backslash escapes work in the URL.
  - Output: `<a href="url">text</a>`, with the URL attribute-escaped.
- **Safe URLs:** remove whitespace and control characters, lowercase, then read the scheme (`^[a-z][a-z0-9+.-]*:`).
  - If there is a scheme and it isn't `http`, `https` or `mailto`, the href becomes `#`.
  - Relative URLs are fine.
