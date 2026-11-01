# CLI argument parser

Write `minimist` first, then a small `yargs`: a schema-driven parser with subcommands, errors and help text.

```ts
parseArgs(['--a=1', '--b', '2', '-xyz', 'file', '--', '--raw']);
// { _: ['file', '--raw'], a: 1, b: 2, x: true, y: true, z: true }

const cli = createCli({ name: 'git', commands: { remote: { commands: { add: {
  options: { name: { type: 'string', required: true }, fetch: { type: 'boolean', alias: 'f' } },
} } } } });
cli.parse(['remote', 'add', '-f', '--name', 'origin', 'git@host:repo']);
// { command: ['remote', 'add'], options: { fetch: true, name: 'origin' }, _: ['git@host:repo'], errors: [] }
```

**Flag-like tokens.** A token is flag-like if it starts with `-`, is longer than one character, and is not a number. Numbers match `-?\d+(\.\d+)?`, so `-5` and `-` are positionals.

## `parseArgs(argv)`: no schema

- `--` ends parsing. Everything after it goes to `_` verbatim.
- A token that isn't flag-like goes to `_` as a string.
- `--key=value` sets `key` to `value`.
- `--no-key` sets `key` to `false`.
- `--key` takes the next token as its value if that token exists and isn't flag-like or `--`. Otherwise it's `true`.
- `-x` follows the same rule as `--key`.
- A group like `-xyz` sets each letter to `true` and never takes the next token.
- `-abc=v` sets `a` and `b` to `true` and `c` to `v`.
- Values (not positionals) matching the number pattern become numbers.
- A key set more than once becomes an array of its values in order.

## `createCli(spec)`

```ts
interface OptionSpec { type: 'string' | 'number' | 'boolean' | 'array'; alias?: string | string[];
                       default?: unknown; required?: boolean; description?: string }
interface CommandSpec { description?: string; options?: Record<string, OptionSpec>; commands?: Record<string, CommandSpec> }
createCli(spec: CommandSpec & { name: string }): { parse(argv): CliResult; help(path?: string[]): string }
interface CliResult { command: string[]; options: Record<string, unknown>; _: string[]; errors: string[] }
```

`parse` never throws. It collects messages in `errors`, in the order found.

**Commands**
- While the current command has `commands` and no positional has been collected yet, a positional token must name a subcommand. It is appended to `command`, and parsing continues in that subcommand.
- Otherwise the error is ``Unknown command: <tok>`` and the token goes to `_`. If a subcommand name is within edit distance 2, add ``. Did you mean <name>?`` (the nearest, earliest on ties).
- The options available at any point are those of every command on the path so far, root first. A child's definition overrides a parent's.

**Options**
- `--name` and `--alias` find an option. A one-letter alias is used as `-a`.
- Results are keyed by the option's name, never its alias.
- `boolean` options never take the next token.
  - `--x=true` and `--x=false` are allowed; any other value is an ``Invalid boolean for --x: <v>`` error.
  - `--no-x` sets `false`.
- `string`, `number` and `array` options take an inline `=value` or else the next token, unless that token is missing, flag-like or `--`. In that case the error is ``Missing value for --x``. So `--n -5` is fine.
- A `number` value must match the number pattern, or the error is ``Invalid number for --x: <v>``.
- `array` options collect every value (as strings) in order.
- For other types, the last value wins.
- In a short group (`-fv`, `-fn=3`), every letter but the last must be a boolean option. Otherwise the error is ``Missing value for --x``. The last letter behaves like a single short flag.
- Unknown flags give ``Unknown option: --colr``, or ``Unknown option: -q`` for a short flag. For `--` flags, add ``. Did you mean --color?`` when an available option name or long alias is within edit distance 2 (nearest, earliest on ties).

**After the loop.** For each available option that wasn't given, in definition order: use its `default` if it has one, otherwise report ``Missing required option: --x`` if it's required.

## `help(path = [])`

`help` throws ``Unknown command: <p>`` for a bad path. Otherwise it returns these lines joined with `\n`:

```
Usage: git remote add [options]          ← name + path, then " <command>" if it has subcommands
                                           (blank line + description, if any)

Commands:                                ← only if it has subcommands
  add  Add a remote                      ← "  name" + "  description" if any

Options:                                 ← only if any options are available; all available options in order
  -v, --verbose  Verbose output
  --depth <number>  Fetch depth (default: 1)
  -t, --tag <string...>  Tags (required)
```

**Option lines**
- Start with two spaces.
- Then the aliases (`-v` or `--long`), followed by `--name`, all joined with `, `.
- Then ` <type>` for non-booleans, or ` <string...>` for arrays.
- Then `  description` if there is one.
- Then ` (default: <JSON>)` if there is a default.
- Then ` (required)` if the option is required.
