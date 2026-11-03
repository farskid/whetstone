Read a `.env` file into an object the way `dotenv` does. Start with plain `KEY=value` lines.

```ts
parse('# db\nexport HOST=localhost\nPORT = 5432\nNAME="app"\n');
// { HOST: 'localhost', PORT: '5432', NAME: 'app' }
```

```ts
function parse(src: string): Record<string, string>;
```

- Lines end with `\n` or `\r\n`. A leading BOM (`\uFEFF`) is ignored. <!-- tests: CRLF line endings, BOM and export prefixes -->
- Blank lines, lines starting with `#`, and lines that aren't `KEY=...` are skipped. Leading whitespace doesn't matter. <!-- tests: parses KEY=value lines and skips comments and blank lines -->
- `KEY` matches `[A-Za-z_][A-Za-z0-9_.-]*` and may be preceded by `export ` (one or more spaces). Spaces around `=` are allowed. <!-- tests: spaces around =, = inside values, empty values, later keys win | CRLF line endings, BOM and export prefixes -->
- The value is the rest of the line, trimmed. `=` inside a value is kept, and an empty value is `''`. <!-- tests: spaces around =, = inside values, empty values, later keys win -->
- If the trimmed value is at least two characters long and starts and ends with the same quote (`'`, `"` or `` ` ``), those two quotes are removed. Quotes are otherwise ordinary characters in this stage, and so is `#` after the `=`.
- A key that appears again overrides the earlier value. <!-- tests: spaces around =, = inside values, empty values, later keys win -->
