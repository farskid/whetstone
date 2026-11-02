Add links, with only safe URLs.

```ts
render('see [the *docs*](https://x.dev/a?b=1&c=2) or [this](javascript:alert(1))');
// '<p>see <a href="https://x.dev/a?b=1&amp;c=2">the <em>docs</em></a> or <a href="#">this</a>)</p>'
```

**Links:** `[text](url)`.
- Brackets in the text nest (a backslash-escaped bracket doesn't count), and the link needs `(` right after the closing `]`.
- The URL runs to the first `)`. With no `)`, or a URL containing whitespace, it isn't a link and the `[` is literal text.
- Render the text as inline content, without links inside links: `[outer [inner](a)](b)` links `outer [inner](a)` to `b`.
- Backslash escapes work in the URL.
- Output: `<a href="url">text</a>`, with the URL escaped like text.

**Safe URLs:** to check a URL, remove whitespace and control characters, lowercase it, then read the scheme (`^[a-z][a-z0-9+.-]*:`).
- If there is a scheme and it isn't `http`, `https` or `mailto`, the href becomes `#`.
- Otherwise the href is the URL as written (after backslash escapes). Relative URLs are fine.
