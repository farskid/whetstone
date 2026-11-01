export type Operation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }
  | { op: 'copy'; from: string; path: string }
  | { op: 'test'; path: string; value: unknown };

export interface DiffOptions {
  /** Identity of an array item. When given, reordered items become `move` ops. */
  objectHash?: (item: unknown, index: number) => string;
}

export class PatchError extends Error {
  constructor(message: string, public index: number, public operation: Operation) {
    super(message);
    this.name = 'PatchError';
  }
}

export function isEqual(a: unknown, b: unknown): boolean {
  throw new Error('Not implemented');
}

export function diff(a: unknown, b: unknown, options: DiffOptions = {}): Operation[] {
  throw new Error('Not implemented');
}

export function applyPatch<T>(doc: T, ops: Operation[]): T {
  throw new Error('Not implemented');
}
