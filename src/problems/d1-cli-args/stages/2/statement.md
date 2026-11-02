Add a small `yargs`: a parser driven by an option schema, which reports errors instead of throwing.

```ts
const cli = createCli({ name: 'tool', options: {
  verbose: { type: 'boolean', alias: 'v' },
  count: { type: 'number', alias: ['c', 'num'], default: 3 },
} });
cli.parse(['-v', 'file.txt']);
// { command: [], options: { verbose: true, count: 3 }, _: ['file.txt'], errors: [] }
```

```ts
interface OptionSpec { type: 'string' | 'number' | 'boolean' | 'array'; alias?: string | string[];
                       default?: unknown; required?: boolean }
createCli(spec: { name: string; options?: Record<string, OptionSpec> }): { parse(argv: string[]): CliResult }
interface CliResult { command: string[]; options: Record<string, unknown>; _: string[]; errors: string[] }
```

`parse` never throws. It collects messages in `errors`, in the order found. `command` is always `[]` in this stage. Flag-like tokens, numbers, `--` and positionals work as in stage 1.

**Options**
- `--name` and `--alias` find an option. A one-letter alias is used as `-a`.
- Results are keyed by the option's name, never its alias.
- `boolean` options never take the next token.
  - `--x=true` and `--x=false` are allowed; any other value is an ``Invalid boolean for --x: <v>`` error.
  - `--no-x` sets `false`. It only works for boolean options; for anything else, `--no-x` is an unknown option.
- `string`, `number` and `array` options take an inline `=value` or else the next token, unless that token is missing, flag-like or `--`. In that case the error is ``Missing value for --x``. So `--n -5` is fine.
- A `number` value must match the number pattern, or the error is ``Invalid number for --x: <v>``. `string` values stay strings, even `'123'`.
- `array` options collect every value (as strings) in order.
- For other types, the last value wins.
- In a short group (`-fv`, `-fn=3`), every letter but the last must be a boolean option. Otherwise the error is ``Missing value for --x``. The last letter behaves like a single short flag.
- Unknown flags give ``Unknown option: --colr``, or ``Unknown option: -q`` for a short flag (one error per unknown letter). The `=value` part is not included.
- An option whose value was invalid counts as not given.

**After the loop.** For each option that wasn't given, in definition order: use its `default` if it has one, otherwise report ``Missing required option: --x`` if it's required. A default satisfies `required`.
