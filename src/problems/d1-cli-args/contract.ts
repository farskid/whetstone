// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { createCli } from './solution';

/**
 * @contract createCli
 * @change `createCli` returns a `Cli` with `help(path?)` as well as `parse`.
 * Your `createCli` doesn't return `help` yet. Return a `Cli` (from `./types`).
 */
export function helpText(): string {
  return createCli({ name: 'git' }).help(['remote']);
}
