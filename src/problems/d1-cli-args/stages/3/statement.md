Add nested subcommands that inherit their parents' options.

```ts
const cli = createCli({ name: 'git', commands: { remote: { commands: { add: {
  options: { name: { type: 'string', required: true }, fetch: { type: 'boolean', alias: 'f' } },
} } } } });
cli.parse(['remote', 'add', '-f', '--name', 'origin', 'git@host:repo']);
// { command: ['remote', 'add'], options: { fetch: true, name: 'origin' }, _: ['git@host:repo'], errors: [] }

interface CommandSpec { options?: Record<string, OptionSpec>; commands?: Record<string, CommandSpec> }
createCli(spec: CommandSpec & { name: string })
```

- While the current command has `commands` and no positional has been collected yet, a positional token must name a subcommand. It is appended to `command`, and parsing continues in that subcommand.
- Otherwise the error is ``Unknown command: <tok>`` and the token goes to `_`. Once a positional is collected, later tokens are plain positionals even if they name a subcommand.
- Tokens after `--` are never commands.
- The options available at any point are those of every command on the path so far, root first. A child's definition of a name overrides its parent's. Options of other branches are unknown.
- Flags may appear before the subcommand (`-v remote add`), as long as they are available at that point.
- The defaults and required checks after the loop use the options available at the final command, in that order.
