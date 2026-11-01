export type Argv = Record<string, unknown> & { _: string[] };

export function parseArgs(argv: string[]): Argv {
  throw new Error('Not implemented');
}

export interface OptionSpec {
  type: 'string' | 'number' | 'boolean' | 'array';
  alias?: string | string[];
  default?: unknown;
  required?: boolean;
  description?: string;
}
export interface CommandSpec {
  description?: string;
  options?: Record<string, OptionSpec>;
  commands?: Record<string, CommandSpec>;
}
export interface CliSpec extends CommandSpec {
  name: string;
}
export interface CliResult {
  command: string[];
  options: Record<string, unknown>;
  _: string[];
  errors: string[];
}

export function createCli(spec: CliSpec): { parse(argv: string[]): CliResult; help(path?: string[]): string } {
  throw new Error('Not implemented');
}
