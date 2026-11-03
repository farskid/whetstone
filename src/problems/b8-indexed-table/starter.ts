import type { Id, Row, Query, FindOptions, IndexOptions, IndexFields } from './types';

export class Table<T extends Row> {
  /** Rows examined by the most recent where(). */
  lastScanned = 0;

  insert(row: T): T {
    throw new Error('Not implemented');
  }

  get(id: Id): T | undefined {
    throw new Error('Not implemented');
  }

  update(id: Id, patch: Partial<T>): T {
    throw new Error('Not implemented');
  }

  remove(id: Id): boolean {
    throw new Error('Not implemented');
  }

  createIndex(fields: IndexFields, opts: IndexOptions = {}): void {
    throw new Error('Not implemented');
  }

  where(query: Query, opts: FindOptions = {}): T[] {
    throw new Error('Not implemented');
  }

  subscribe(query: Query, cb: (rows: T[]) => void, opts: FindOptions = {}): () => void {
    throw new Error('Not implemented');
  }
}
