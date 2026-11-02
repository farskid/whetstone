import type { Id, Row, Query } from './types';

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

  where(query: Query): T[] {
    throw new Error('Not implemented');
  }
}
