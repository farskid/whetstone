# .env parser

Read a `.env` file into an object the way `dotenv` does, then expand variable references the way `dotenv-expand` does.

```ts
const vars = parse('export DB_HOST=localhost\nDB_URL="postgres://${DB_HOST}:${DB_PORT:-5432}/app"  # main db\n');
// { DB_HOST: 'localhost', DB_URL: 'postgres://${DB_HOST}:${DB_PORT:-5432}/app' }
expand(vars, process.env);
// { DB_HOST: 'localhost', DB_URL: 'postgres://localhost:5432/app' }
```

## `parse(src): Record<string, string>`

- Lines end with `\n` or `\r\n`. A leading BOM is ignored.
- Blank lines, lines starting with `#`, and lines that aren't `KEY=...` are skipped. Leading whitespace doesn't matter.
- `KEY` matches `[A-Za-z_][A-Za-z0-9_.-]*` and may be preceded by `export `. Spaces around `=` are allowed.
- **Unquoted values** run to the end of the line.
  - A `#` at the start of the value or after whitespace starts a comment, which is dropped.
  - A `#` in the middle of a word is kept (`a#b`).
  - The value is then trimmed. `=` inside a value is kept, and an empty value is `''`.
- **Quoted values** start with `'`, `"` or `` ` `` right after the `=` (and spaces).
  - The value runs to the next matching quote, even across lines, so multiline values work. The quotes are removed.
  - Anything after the closing quote on that line is ignored.
  - Inside **double** quotes only, `\n` becomes a newline and `\r` a carriage return. Single and backtick quotes are literal.
  - If the closing quote is missing, the value is read as unquoted.
- A key that appears again overrides the earlier value.

## `expand(parsed, env = {}): Record<string, string>`

Returns a new object with the same keys in the same order. In every value:

- `${NAME}` and `$NAME` are replaced by NAME's value, and `${NAME:-fallback}` uses `fallback` when NAME is unset or empty. Names match `[A-Za-z_][A-Za-z0-9_]*`.
- NAME is looked up in `parsed` first, already expanded, wherever it appears in the file. If it's not there, `env` is checked. Unset with no fallback gives `''`.
- `\$` becomes a literal `$` and is not expanded.
- A reference cycle throws `Circular reference: A -> B -> A`, starting from the first key of the cycle that was being expanded.
- `parsed` is not modified.
