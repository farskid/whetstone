import type { Id, Row, Query } from './types';

const norm = (v: unknown) => (v === undefined ? null : v);

function matches(row: Row, query: Query): boolean {
  return Object.entries(query).every(([f, want]) =>
    want === null || want === undefined ? row[f] === null || row[f] === undefined : row[f] === want);
}

export class Table<T extends Row> {
  private rows = new Map<Id, T>();
  private seq = new Map<Id, number>();
  private nextSeq = 0;
  /** field -> value (missing as null) -> ids with that value. */
  private indexes = new Map<string, Map<unknown, Set<Id>>>();
  /** Rows examined by the most recent where(). */
  lastScanned = 0;

  insert(row: T): T {
    if (this.rows.has(row.id)) throw new Error(`Duplicate id ${String(row.id)}`);
    const stored = Object.freeze({ ...row }) as T;
    this.rows.set(stored.id, stored);
    this.seq.set(stored.id, this.nextSeq++);
    this.index(stored, true);
    return stored;
  }

  get(id: Id): T | undefined { return this.rows.get(id); }

  update(id: Id, patch: Partial<T>): T {
    const old = this.rows.get(id);
    if (!old) throw new Error(`No row ${String(id)}`);
    if ('id' in patch && patch.id !== id) throw new Error('Cannot change id');
    if (Object.keys(patch).every((k) => Object.is((old as any)[k], (patch as any)[k]))) return old;
    const next = Object.freeze({ ...old, ...patch }) as T;
    this.index(old, false);
    this.index(next, true);
    this.rows.set(id, next);
    return next;
  }

  remove(id: Id): boolean {
    const old = this.rows.get(id);
    if (!old) return false;
    this.index(old, false);
    this.rows.delete(id);
    this.seq.delete(id);
    return true;
  }

  createIndex(field: string): void {
    if (this.indexes.has(field)) return;
    this.indexes.set(field, new Map());
    for (const r of this.rows.values()) this.addTo(field, r);
  }

  where(query: Query): T[] {
    let candidates: Iterable<Id> = this.rows.keys();
    let best = this.rows.size;
    for (const [field, want] of Object.entries(query)) {
      const ix = this.indexes.get(field);
      if (!ix) continue;
      const ids = ix.get(norm(want)) ?? new Set<Id>();
      if (ids.size < best) { best = ids.size; candidates = ids; }
    }
    const out: T[] = [];
    let scanned = 0;
    for (const id of candidates) {
      scanned++;
      const r = this.rows.get(id)!;
      if (matches(r, query)) out.push(r);
    }
    this.lastScanned = scanned;
    return out.sort((a, b) => this.seq.get(a.id)! - this.seq.get(b.id)!);
  }

  private addTo(field: string, r: T) {
    const ix = this.indexes.get(field)!;
    const v = norm(r[field]);
    let ids = ix.get(v);
    if (!ids) ix.set(v, (ids = new Set()));
    ids.add(r.id);
  }

  private index(r: T, add: boolean) {
    for (const [field, ix] of this.indexes) {
      if (add) { this.addTo(field, r); continue; }
      const ids = ix.get(norm(r[field]));
      ids?.delete(r.id);
      if (ids && !ids.size) ix.delete(norm(r[field]));
    }
  }
}
