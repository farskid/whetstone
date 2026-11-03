Add "did you mean" suggestions and generated help text.

```ts
// CommandSpec and OptionSpec gain: description?: string
createCli(spec): { parse(argv): CliResult; help(path?: string[]): string }
```

**Suggestions** use the edit distance between two strings (insertions, deletions and substitutions).
- ``Unknown command: <tok>`` gets ``. Did you mean <name>?`` when a subcommand name of the current command is within edit distance 2. <!-- tests: "did you mean" for options and commands -->
- ``Unknown option: --<x>`` gets ``. Did you mean --<name>?`` when an available option name or long alias (more than one letter) is within edit distance 2. Short flags (`-q`) get no suggestion. <!-- tests: "did you mean" for options and commands -->
- In both cases pick the nearest, and the earliest in definition order on ties (names before their aliases).

## `help(path = [])`

`help` throws ``Unknown command: <p>`` for a bad path. Otherwise it returns these lines joined with `\n`: <!-- tests: help text for a leaf command | help text for the root and bad paths -->

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

Each section after the usage line is preceded by a blank line.

**Option lines**
- Start with two spaces.
- Then the aliases (`-v` or `--long`), followed by `--name`, all joined with `, `. A one-letter name is shown as `-n`.
- Then ` <type>` for non-booleans, or ` <string...>` for arrays.
- Then `  description` if there is one.
- Then ` (default: <JSON>)` if there is a default.
- Then ` (required)` if the option is required.
