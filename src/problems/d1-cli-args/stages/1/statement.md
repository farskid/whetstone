Write `minimist`: turn an argv array into flags and positionals, with no schema.

```ts
parseArgs(['--a=1', '--b', '2', '-xyz', 'file', '--', '--raw']);
// { _: ['file', '--raw'], a: 1, b: 2, x: true, y: true, z: true }
```

```ts
type Argv = Record<string, unknown> & { _: string[] };
function parseArgs(argv: string[]): Argv;
```

**Flag-like tokens.** A token is flag-like if it starts with `-`, is longer than one character, and is not a number. Numbers match `-?\d+(\.\d+)?`, so `-5` and `-` are positionals.

- `--` ends parsing. Everything after it goes to `_` verbatim.
- A token that isn't flag-like goes to `_` as a string. Positionals are never turned into numbers.
- `--key=value` sets `key` to `value` (split at the first `=`, so `--name=a=b` gives `'a=b'`).
- `--no-key` sets `key` to `false`.
- `--key` takes the next token as its value if that token exists and isn't flag-like or `--`. Otherwise it's `true`.
- `-x` follows the same rule as `--key`.
- A group like `-xyz` sets each letter to `true` and never takes the next token.
- `-abc=v` sets `a` and `b` to `true` and `c` to `v`.
- Values (not positionals) matching the number pattern become numbers.
- A key set more than once becomes an array of its values in order, e.g. `['a', 'b', true, 3]`.
