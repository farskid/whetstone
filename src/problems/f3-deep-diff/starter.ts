import type { Operation, DiffOptions } from './types';

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
