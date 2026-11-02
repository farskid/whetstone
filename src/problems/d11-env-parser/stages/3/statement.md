Add `expand`, which resolves variable references the way `dotenv-expand` does.

```ts
const vars = parse('HOST=localhost\nURL="postgres://${HOST}:${PORT:-5432}/app"\n');
expand(vars, process.env);
// { HOST: 'localhost', URL: 'postgres://localhost:5432/app' }

function expand(parsed: Record<string, string>, env?: Record<string, string | undefined>): Record<string, string>;
```

`expand` returns a new object with the same keys in the same order. `env` defaults to `{}`. In every value:

- `${NAME}` and `$NAME` are replaced by NAME's value. `${NAME:-fallback}` uses `fallback` when NAME is unset or empty. Names match `[A-Za-z_][A-Za-z0-9_]*`.
- NAME is looked up in `parsed` first, already expanded, wherever it appears in the file. If it's not there, `env` is checked. Unset with no fallback gives `''`.
- `\$` becomes a literal `$` and is not expanded.
- A reference cycle throws `Circular reference: A -> B -> A`, starting from the first key of the cycle that was being expanded.
- `parsed` is not modified.
