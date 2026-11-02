import type { Id, Row, Query } from './types';

function matches(row: Row, query: Query): boolean {
  return Object.entries(query).every(([f, want]) =>
    want === null || want === undefined ? row[f] === null || row[f] === undefined : row[f] === want);
}

export class Table<T extends Row> {
  private rows = new Map<Id, T>();
  /** Rows examined by the most recent where(). */
  lastScanned = 0;

  insert(row: T): T {
    if (this.rows.has(row.id)) throw new Error(`Duplicate id ${String(row.id)}`);
    const stored = Object.freeze({ ...row }) as T;
    this.rows.set(stored.id, stored);
    return stored;
  }

  get(id: Id): T | undefined { return this.rows.get(id); }

  update(id: Id, patch: Partial<T>): T {
    const old = this.rows.get(id);
    if (!old) throw new Error(`No row ${String(id)}`);
    if ('id' in patch && patch.id !== id) throw new Error('Cannot change id');
    if (Object.keys(patch).every((k) => Object.is((old as any)[k], (patch as any)[k]))) return old;
    const next = Object.freeze({ ...old, ...patch }) as T;
    this.rows.set(id, next);
    return next;
  }

  remove(id: Id): boolean {
    return this.rows.delete(id);
  }

  where(query: Query): T[] {
    this.lastScanned = this.rows.size;
    return [...this.rows.values()].filter((r) => matches(r, query));
  }
}
