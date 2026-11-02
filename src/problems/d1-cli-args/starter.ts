import type { Argv, OptionSpec, CommandSpec, CliSpec, CliResult } from './types';

export function parseArgs(argv: string[]): Argv {
  throw new Error('Not implemented');
}

export function createCli(spec: CliSpec): { parse(argv: string[]): CliResult; help(path?: string[]): string } {
  throw new Error('Not implemented');
}
