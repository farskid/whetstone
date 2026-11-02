import type { Issue } from './types';

export class ValidationError extends Error {
  constructor(public issues: Issue[]) {
    super(issues.map((i) => `${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`).join('\n'));
    this.name = 'ValidationError';
  }
}

// Build schemas however you like; they need .parse / .safeParse plus the
// type-specific methods from the statement.
export const s = {
  string(): any { throw new Error('Not implemented'); },
  number(): any { throw new Error('Not implemented'); },
  boolean(): any { throw new Error('Not implemented'); },
  literal(value: string | number | boolean | null): any { throw new Error('Not implemented'); },
  enum(values: readonly (string | number)[]): any { throw new Error('Not implemented'); },
};
