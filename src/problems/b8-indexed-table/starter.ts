export type Id = string | number;
export type Row = { id: Id } & Record<string, unknown>;
export type Range = { $gt?: unknown; $gte?: unknown; $lt?: unknown; $lte?: unknown };
export type Query = Record<string, unknown>;
export interface FindOptions {
  orderBy?: string | [string, 'asc' | 'desc'];
  limit?: number;
}

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

  createIndex(fields: string | string[], opts: { unique?: boolean } = {}): void {
    throw new Error('Not implemented');
  }

  where(query: Query, opts: FindOptions = {}): T[] {
    throw new Error('Not implemented');
  }

  subscribe(query: Query, cb: (rows: T[]) => void, opts: FindOptions = {}): () => void {
    throw new Error('Not implemented');
  }
}
