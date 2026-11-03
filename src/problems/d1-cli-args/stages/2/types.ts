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
}

export interface CommandSpec {
  options?: Record<string, OptionSpec>;
}

export interface CliSpec extends CommandSpec {
  /** Program name. */
  name: string;
}

export interface CliResult {
  /** Always [] in this stage. */
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
}
