export interface GroupOptions {
  ttl?: number;
  staleAfter?: number;
  clock?: { now(): number };
}

export class Group<T> {
  constructor(options: GroupOptions = {}) {
    throw new Error('Not implemented');
  }

  do(key: string | number, fn: () => T | Promise<T>): Promise<T> {
    throw new Error('Not implemented');
  }

  forget(key: string | number): void {
    throw new Error('Not implemented');
  }
}
