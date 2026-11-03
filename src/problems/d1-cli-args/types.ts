/** parseArgs output: flags by name, positionals in `_`. */
export type Argv = Record<string, unknown> & { _: string[] };

export interface OptionSpec {
  type: 'string' | 'number' | 'boolean' | 'array';
  /** Other names; a one-letter alias is used as `-a`. */
  alias?: string | string[];
  /** Used when the option isn't given. */
  default?: unknown;
  /** Missing (and no default) is an error. */
  required?: boolean;
  /** Shown in help. */
  description?: string;
}

export interface CommandSpec {
  /** Shown in help. */
  description?: string;
  options?: Record<string, OptionSpec>;
  /** Subcommands by name. */
  commands?: Record<string, CommandSpec>;
}

export interface CliSpec extends CommandSpec {
  /** Program name, used in help. */
  name: string;
}

export interface CliResult {
  /** Subcommand path, e.g. ['remote', 'add']. */
  command: string[];
  /** Keyed by option name, never alias. */
  options: Record<string, unknown>;
  _: string[];
  /** Messages in the order found; parse never throws. */
  errors: string[];
}

/** What `createCli` returns. */
export interface Cli {
  parse(argv: string[]): CliResult;
  /** Usage text for the program, or for the command at `path`. */
  help(path?: string[]): string;
}
