// Bug: insert stores the row before checking unique indexes
export type Id = string | number;
export type Row = { id: Id } & Record<string, unknown>;
export type Range = { $gt?: unknown; $gte?: unknown; $lt?: unknown; $lte?: unknown };
export type Query = Record<string, unknown>;
export interface FindOptions {
  orderBy?: string | [string, 'asc' | 'desc'];
  limit?: number;
}

type Key = unknown[];
interface Index { fields: string[]; unique: boolean; entries: { key: Key; id: Id }[] }
interface Sub { query: Query; opts: FindOptions; cb: (rows: any[]) => void; last: any[] }
interface Cond { eq?: unknown; hasEq: boolean; lo?: unknown; loInc?: boolean; hi?: unknown; hiInc?: boolean; hasRange: boolean }

const OPS = new Set(['$gt', '$gte', '$lt', '$lte']);

function norm(v: unknown): unknown { return v === undefined ? null : v; }
function rank(v: unknown): number {
  v = norm(v);
  if (v === null) return 0;
  switch (typeof v) { case 'boolean': return 1; case 'number': return 2; case 'string': return 3; default: return 4; }
}
function cmp(a: unknown, b: unknown): number {
  a = norm(a); b = norm(b);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0 || ra === 4) return 0;
  return (a as any) < (b as any) ? -1 : (a as any) > (b as any) ? 1 : 0;
}
function cmpKeys(a: Key, b: Key, n = a.length): number {
  for (let i = 0; i < n; i++) { const c = cmp(a[i], b[i]); if (c) return c; }
  return 0;
}

function parseCond(c: unknown): Cond {
  if (c !== null && typeof c === 'object' && Object.getPrototypeOf(c) === Object.prototype) {
    const keys = Object.keys(c);
    if (keys.length && keys.every((k) => k.startsWith('$'))) {
      const r = c as Range;
      for (const k of keys) if (!OPS.has(k)) throw new Error(`Unknown operator ${k}`);
      const out: Cond = { hasEq: false, hasRange: true };
      if ('$gt' in r) { out.lo = r.$gt; out.loInc = false; }
      if ('$gte' in r) { out.lo = r.$gte; out.loInc = true; }
      if ('$lt' in r) { out.hi = r.$lt; out.hiInc = false; }
      if ('$lte' in r) { out.hi = r.$lte; out.hiInc = true; }
      return out;
    }
  }
  return { eq: c, hasEq: true, hasRange: false };
}

function matchCond(v: unknown, c: Cond): boolean {
  if (c.hasEq) return c.eq === null || c.eq === undefined ? v === null || v === undefined : v === c.eq;
  const t = rank(c.lo !== undefined ? c.lo : c.hi);
  if (rank(v) !== t || t === 0) return false;
  if (c.lo !== undefined) { const d = cmp(v, c.lo); if (d < 0 || (d === 0 && !c.loInc)) return false; }
  if (c.hi !== undefined) { const d = cmp(v, c.hi); if (d > 0 || (d === 0 && !c.hiInc)) return false; }
  return true;
}

export class Table<T extends Row> {
  private rows = new Map<Id, T>();
  private seq = new Map<Id, number>();
  private nextSeq = 0;
  private indexes: Index[] = [];
  private subs = new Set<Sub>();
  /** Rows examined by the most recent where(). */
  lastScanned = 0;

  insert(row: T): T {
    if (this.rows.has(row.id)) throw new Error(`Duplicate id ${String(row.id)}`);
    const stored = Object.freeze({ ...row }) as T;
    this.rows.set(stored.id, stored);
    this.checkUnique(stored, undefined);
    this.seq.set(stored.id, this.nextSeq++);
    for (const ix of this.indexes) this.addEntry(ix, stored);
    this.notify();
    return stored;
  }

  get(id: Id): T | undefined { return this.rows.get(id); }

  update(id: Id, patch: Partial<T>): T {
    const old = this.rows.get(id);
    if (!old) throw new Error(`No row ${String(id)}`);
    if ('id' in patch && patch.id !== id) throw new Error('Cannot change id');
    if (Object.keys(patch).every((k) => Object.is((old as any)[k], (patch as any)[k]))) return old;
    const next = Object.freeze({ ...old, ...patch }) as T;
    this.checkUnique(next, id);
    for (const ix of this.indexes) { this.removeEntry(ix, old); this.addEntry(ix, next); }
    this.rows.set(id, next);
    this.notify();
    return next;
  }

  remove(id: Id): boolean {
    const old = this.rows.get(id);
    if (!old) return false;
    for (const ix of this.indexes) this.removeEntry(ix, old);
    this.rows.delete(id);
    this.seq.delete(id);
    this.notify();
    return true;
  }

  createIndex(fields: string | string[], opts: { unique?: boolean } = {}): void {
    const ix: Index = { fields: Array.isArray(fields) ? fields : [fields], unique: !!opts.unique, entries: [] };
    for (const r of this.rows.values()) {
      if (ix.unique) {
        const key = this.keyOf(ix, r);
        if (!key.some((k) => k === null) && this.findEntry(ix, key) >= 0) throw new Error(`Unique index on ${ix.fields.join(',')} violated`);
      }
      this.addEntry(ix, r);
    }
    this.indexes.push(ix);
  }

  where(query: Query, opts: FindOptions = {}): T[] {
    const { rows, scanned } = this.run(query, opts);
    this.lastScanned = scanned;
    return rows;
  }

  subscribe(query: Query, cb: (rows: T[]) => void, opts: FindOptions = {}): () => void {
    const sub: Sub = { query, opts, cb, last: this.run(query, opts).rows };
    this.subs.add(sub);
    cb(sub.last);
    return () => { this.subs.delete(sub); };
  }

  // ---- internals ----

  private notify() {
    for (const sub of [...this.subs]) {
      if (!this.subs.has(sub)) continue;
      const rows = this.run(sub.query, sub.opts).rows;
      const same = rows.length === sub.last.length && rows.every((r, i) => r === sub.last[i]);
      if (same) continue;
      sub.last = rows;
      sub.cb(rows);
    }
  }

  private run(query: Query, opts: FindOptions): { rows: T[]; scanned: number } {
    const conds = Object.entries(query).map(([f, c]) => [f, parseCond(c)] as const);
    let candidates: Iterable<T> = this.rows.values();
    let best = this.rows.size;
    for (const ix of this.indexes) {
      const span = this.span(ix, new Map(conds));
      if (span && span[1] - span[0] < best) {
        best = span[1] - span[0];
        candidates = ix.entries.slice(span[0], span[1]).map((e) => this.rows.get(e.id)!);
      }
    }
    let scanned = 0;
    const out: T[] = [];
    for (const r of candidates) {
      scanned++;
      if (conds.every(([f, c]) => matchCond((r as any)[f], c))) out.push(r);
    }
    out.sort((a, b) => this.seq.get(a.id)! - this.seq.get(b.id)!);
    if (opts.orderBy !== undefined) {
      const [field, dir] = Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy, 'asc'];
      const sign = dir === 'desc' ? -1 : 1;
      out.sort((a, b) => sign * cmp((a as any)[field], (b as any)[field]));
    }
    return { rows: opts.limit !== undefined ? out.slice(0, opts.limit) : out, scanned };
  }

  /** [start, end) of index entries that can match, or null if the index can't help. */
  private span(ix: Index, conds: Map<string, Cond>): [number, number] | null {
    const prefix: unknown[] = [];
    let range: Cond | undefined;
    for (const f of ix.fields) {
      const c = conds.get(f);
      if (!c) break;
      if (c.hasEq) { prefix.push(norm(c.eq)); continue; }
      range = c;
      break;
    }
    if (!prefix.length && !range) return null;
    const k = prefix.length;
    const before = (key: Key) => {
      const d = cmpKeys(key, prefix, k);
      if (d) return d < 0;
      if (!range) return false;
      if (range.lo !== undefined) { const e = cmp(key[k], range.lo); return e < 0 || (e === 0 && !range.loInc); }
      return rank(key[k]) < rank(range.hi);
    };
    const after = (key: Key) => {
      const d = cmpKeys(key, prefix, k);
      if (d) return d > 0;
      if (!range) return false;
      if (range.hi !== undefined) { const e = cmp(key[k], range.hi); return e > 0 || (e === 0 && !range.hiInc); }
      return rank(key[k]) > rank(range.lo);
    };
    const e = ix.entries;
    const bs = (pred: (key: Key) => boolean) => {
      let lo = 0, hi = e.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (pred(e[m].key)) lo = m + 1; else hi = m; }
      return lo;
    };
    const start = bs(before);
    const end = bs((key) => !after(key));
    return [start, Math.max(start, end)];
  }

  private keyOf(ix: Index, r: T): Key { return ix.fields.map((f) => norm((r as any)[f])); }

  private findEntry(ix: Index, key: Key): number {
    return ix.entries.findIndex((e) => cmpKeys(e.key, key) === 0);
  }

  private checkUnique(r: T, selfId: Id | undefined) {
    for (const ix of this.indexes) {
      if (!ix.unique) continue;
      const key = this.keyOf(ix, r);
      if (key.some((k) => k === null)) continue;
      const clash = ix.entries.find((e) => e.id !== selfId && cmpKeys(e.key, key) === 0);
      if (clash) throw new Error(`Unique index on ${ix.fields.join(',')} violated by ${String(r.id)}`);
    }
  }

  private addEntry(ix: Index, r: T) {
    const key = this.keyOf(ix, r);
    const s = this.seq.get(r.id)!;
    let lo = 0, hi = ix.entries.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      const d = cmpKeys(ix.entries[m].key, key) || this.seq.get(ix.entries[m].id)! - s;
      if (d < 0) lo = m + 1; else hi = m;
    }
    ix.entries.splice(lo, 0, { key, id: r.id });
  }

  private removeEntry(ix: Index, r: T) {
    const i = ix.entries.findIndex((e) => e.id === r.id);
    if (i >= 0) ix.entries.splice(i, 1);
  }
}
