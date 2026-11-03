Write `render(markdown)`, which turns a small Markdown subset into HTML in the spirit of `marked`. Start with the block structure. The rules below are the whole spec, and the output must match them exactly.

```ts
render('# Title\n\nFirst line\n  second line\n```ts\nx < 1\n```');
// <h1>Title</h1>
// <p>First line
// second line</p>
// <pre><code class="language-ts">x &lt; 1
// </code></pre>
```

```ts
function render(markdown: string): string;
```

**General**
- Normalize `\r\n` and `\r` to `\n`. <!-- tests: text is HTML-escaped; CRLF is normalized -->
- Rendered blocks are joined with `\n`, with no trailing newline. Empty input gives `''`.
- Blank lines (only whitespace) separate blocks and produce nothing.
- Escape all text as `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`. Raw HTML is **not** supported; it's just text. <!-- tests: text is HTML-escaped; CRLF is normalized -->
- Block markers must start at column 0.

**Fenced code.** A line matching `` ```lang `` (where `lang` is optional `[\w+-]*`, with optional spaces or tabs around it) opens a fence. <!-- tests: fenced code keeps content verbatim -->
- The fence runs until a line that is just ```` ``` ```` (trailing spaces allowed), or until the end of the input. <!-- tests: fenced code keeps content verbatim -->
- Output: `<pre><code class="language-lang">…</code></pre>`. Leave out the class when there is no lang. <!-- tests: fenced code keeps content verbatim -->
- Each content line is escaped and followed by `\n`. <!-- tests: fenced code keeps content verbatim -->

**Headings.** One to six `#`, then a space or tab, then the text. <!-- tests: headings and paragraphs -->
- Output: `<hN>text</hN>`, with the text trimmed and escaped. <!-- tests: headings and paragraphs -->
- `#` (up to `######`) alone gives an empty heading.
- `#text` with no space, or seven `#`, is **not** a heading. <!-- tests: headings and paragraphs -->

**Paragraphs.** Anything else. <!-- tests: headings and paragraphs -->
- A paragraph keeps consecutive non-blank lines until one starts a fence or a heading.
- Each line is trimmed, and lines are joined with `\n`.
- Output: `<p>text</p>`.

In this stage, no line starts with `>` or a list marker (`- `, `* `, `+ `, `1. `). Text is only escaped; there's no inline formatting yet.
