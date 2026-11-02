/** parseArgs output: flags by name, positionals in `_`. */
export type Argv = Record<string, unknown> & { _: string[] };
