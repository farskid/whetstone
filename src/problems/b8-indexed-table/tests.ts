import type { TestCase } from '../../runner/types';
type M = typeof import('./solution');

const G1 = 'CRUD';
const G2 = 'Indexed lookups';
const G3 = 'Ranges, compound, ordering';
const G4 = 'Live queries';

type U = { id: number; name: string; team?: string | null; age?: number | string; email?: string | null; role?: string };

function seed({ Table }: M) {
  const t = new Table<U>();
  const rows: U[] = [
    { id: 1, name: 'Ada', team: 'core', age: 36, role: 'lead' },
    { id: 2, name: 'Bo', team: 'web', age: 24, role: 'dev' },
    { id: 3, name: 'Cy', team: 'core', age: 29, role: 'dev' },
    { id: 4, name: 'Di', team: 'data', age: 41, role: 'lead' },
    { id: 5, name: 'Ed', team: 'core', age: 24, role: 'dev' },
    { id: 6, name: 'Flo', team: 'web', age: 33, role: 'lead' },
  ];
  for (const r of rows) t.insert(r);
  return t;
}
const ids = (rows: { id: unknown }[]) => rows.map((r) => r.id);

export const tests: TestCase<M>[] = [
  {
    group: G1,
    title: 'insert, get, update, remove',
    run({ Table }, { expect }) {
      const t = new Table<U>();
      const src = { id: 1, name: 'Ada', age: 36 };
      const stored = t.insert(src);
      expect(stored).toEqual(src);
      expect(stored === src, 'stores a copy').toBe(false);
      expect(Object.isFrozen(stored), 'stored rows are frozen').toBe(true);
      src.name = 'changed';
      expect(t.get(1)!.name).toBe('Ada');
      const up = t.update(1, { age: 37 });
      expect(up).toEqual({ id: 1, name: 'Ada', age: 37 });
      expect(up === stored, 'update makes a new row').toBe(false);
      expect(t.get(1)).toBe(up);
      expect(t.remove(1)).toBe(true);
      expect(t.remove(1)).toBe(false);
      expect(t.get(1)).toBeUndefined();
    },
  },
  {
    group: G1,
    title: 'errors: duplicate id, unknown id, changing id; no-op update keeps the row object',
    run({ Table }, { expect }) {
      const t = new Table<U>();
      const a = t.insert({ id: 'a' as any, name: 'A' });
      expect(() => t.insert({ id: 'a' as any, name: 'again' })).toThrow();
      expect(() => t.update('nope' as any, { name: 'x' })).toThrow();
      expect(() => t.update('a' as any, { id: 'b' as any })).toThrow();
      expect(t.update('a' as any, { name: 'A' }), 'same value: no change').toBe(a);
      expect(t.where({}).length).toBe(1);
    },
  },
  {
    group: G1,
    title: 'where without indexes: equality, null matches missing, insertion order',
    run(m, { expect }) {
      const t = seed(m);
      t.insert({ id: 7, name: 'Gus' });
      t.insert({ id: 8, name: 'Hal', team: null });
      expect(ids(t.where({ team: 'core' }))).toEqual([1, 3, 5]);
      expect(ids(t.where({ team: 'core', role: 'dev' }))).toEqual([3, 5]);
      expect(ids(t.where({ team: null })), 'null and missing').toEqual([7, 8]);
      expect(ids(t.where({}))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(t.lastScanned, 'no index: every row').toBe(8);
    },
  },
  {
    group: G2,
    title: 'an equality index scans only the matching rows',
    run(m, { expect }) {
      const t = seed(m);
      t.where({ team: 'core' });
      expect(t.lastScanned, 'before createIndex').toBe(6);
      t.createIndex('team');
      expect(ids(t.where({ team: 'core' }))).toEqual([1, 3, 5]);
      expect(t.lastScanned).toBe(3);
      expect(ids(t.where({ team: 'core', role: 'lead' }))).toEqual([1]);
      expect(t.lastScanned, 'other fields are checked on the candidates').toBe(3);
      expect(ids(t.where({ team: 'nope' }))).toEqual([]);
      expect(t.lastScanned).toBe(0);
      expect(ids(t.where({ role: 'lead' }))).toEqual([1, 4, 6]);
      expect(t.lastScanned, 'unindexed field: full scan').toBe(6);
    },
  },
  {
    group: G2,
    title: 'the index follows inserts, removes and updates that change the indexed field',
    run(m, { expect }) {
      const t = seed(m);
      t.createIndex('team');
      t.update(2, { team: 'core' });
      t.update(3, { team: 'web' });
      t.remove(5);
      t.insert({ id: 9, name: 'Ivy', team: 'core' });
      t.update(1, { age: 50 });
      expect(ids(t.where({ team: 'core' }))).toEqual([1, 2, 9]);
      expect(t.lastScanned).toBe(3);
      expect(ids(t.where({ team: 'web' }))).toEqual([3, 6]);
      expect(t.lastScanned).toBe(2);
      expect(t.where({ team: 'core' })[0].age, 'returns the current row').toBe(50);
    },
  },
  {
    group: G2,
    title: 'null and missing values are indexed under null',
    run({ Table }, { expect }) {
      const t = new Table<U>();
      t.createIndex('team');
      t.insert({ id: 1, name: 'a', team: 'x' });
      t.insert({ id: 2, name: 'b' });
      t.insert({ id: 3, name: 'c', team: null });
      t.insert({ id: 4, name: 'd', team: 'x' });
      expect(ids(t.where({ team: null }))).toEqual([2, 3]);
      expect(t.lastScanned).toBe(2);
      t.update(2, { team: 'x' });
      expect(ids(t.where({ team: undefined }))).toEqual([3]);
      expect(t.lastScanned).toBe(1);
    },
  },
  {
    group: G3,
    title: 'range operators, combined bounds, and type bracketing',
    run({ Table }, { expect }) {
      const t = new Table<U>();
      [36, 24, 29, '9', 41, undefined, 24].forEach((age, i) => t.insert({ id: i + 1, name: 'n' + i, age }));
      expect(ids(t.where({ age: { $gt: 24 } }))).toEqual([1, 3, 5]);
      expect(ids(t.where({ age: { $gte: 24, $lt: 36 } }))).toEqual([2, 3, 7]);
      expect(ids(t.where({ age: { $lte: 29 } })), "'9' and missing don't match a number bound").toEqual([2, 3, 7]);
      expect(ids(t.where({ age: { $gt: '1' } })), 'string bound matches strings only').toEqual([4]);
      expect(() => t.where({ age: { $ne: 3 } })).toThrow();
      t.createIndex('age');
      expect(ids(t.where({ age: { $gte: 24, $lt: 36 } })), 'same answer with an index').toEqual([2, 3, 7]);
      expect(t.lastScanned).toBe(3);
      expect(ids(t.where({ age: { $gt: 30 } }))).toEqual([1, 5]);
      expect(t.lastScanned, 'open upper bound stays within numbers').toBe(2);
      expect(ids(t.where({ age: { $lt: 'z' } }))).toEqual([4]);
      expect(t.lastScanned).toBe(1);
    },
  },
  {
    group: G3,
    title: 'compound index: equality prefix plus a range on the next field',
    run(m, { expect }) {
      const t = seed(m);
      t.createIndex(['team', 'age']);
      expect(ids(t.where({ team: 'core', age: 24 }))).toEqual([5]);
      expect(t.lastScanned).toBe(1);
      expect(ids(t.where({ team: 'core', age: { $gte: 25 } }))).toEqual([1, 3]);
      expect(t.lastScanned).toBe(2);
      expect(ids(t.where({ team: 'core' })), 'prefix only').toEqual([1, 3, 5]);
      expect(t.lastScanned).toBe(3);
      expect(ids(t.where({ age: 24 })), 'not a prefix: full scan').toEqual([2, 5]);
      expect(t.lastScanned).toBe(6);
    },
  },
  {
    group: G3,
    title: 'picks the usable index with the fewest candidates',
    run(m, { expect }) {
      const t = seed(m);
      t.createIndex('team');
      t.createIndex('role');
      t.createIndex('name');
      expect(ids(t.where({ team: 'core', role: 'lead' }))).toEqual([1]);
      expect(t.lastScanned, 'role=lead (3) vs team=core (3)').toBe(3);
      expect(ids(t.where({ team: 'data', role: 'dev' }))).toEqual([]);
      expect(t.lastScanned, 'team=data has 1 candidate').toBe(1);
      expect(ids(t.where({ role: 'dev', name: 'Bo' }))).toEqual([2]);
      expect(t.lastScanned, 'name index wins').toBe(1);
    },
  },
  {
    group: G3,
    title: 'unique index: rejects duplicates atomically, exempts null and missing',
    run({ Table }, { expect }) {
      const t = new Table<U>();
      t.createIndex('team');
      t.createIndex('email', { unique: true });
      t.insert({ id: 1, name: 'a', email: 'a@x', team: 't' });
      t.insert({ id: 2, name: 'b' });
      t.insert({ id: 3, name: 'c' });
      t.insert({ id: 4, name: 'd', email: null });
      t.insert({ id: 5, name: 'e', email: null });
      expect(() => t.insert({ id: 6, name: 'f', email: 'a@x', team: 't' })).toThrow();
      expect(t.get(6), 'failed insert leaves nothing behind').toBeUndefined();
      expect(ids(t.where({ team: 't' }))).toEqual([1]);
      expect(() => t.update(2, { email: 'a@x', team: 't' })).toThrow();
      expect(t.get(2)!.email).toBeUndefined();
      expect(ids(t.where({ team: 't' })), 'failed update leaves indexes alone').toEqual([1]);
      t.update(1, { email: 'a@x', name: 'A' });
      t.update(1, { email: 'new@x' });
      t.update(2, { email: 'a@x' });
      expect(ids(t.where({ email: 'a@x' }))).toEqual([2]);
      const dup = new Table<U>();
      dup.insert({ id: 1, name: 'same' });
      dup.insert({ id: 2, name: 'same' });
      expect(() => dup.createIndex('name', { unique: true })).toThrow();
    },
  },
  {
    group: G3,
    title: 'orderBy and limit: stable ties, nulls first ascending, limit after sort',
    run(m, { expect }) {
      const t = seed(m);
      t.insert({ id: 7, name: 'Gus', team: 'core' });
      expect(ids(t.where({}, { orderBy: 'age' }))).toEqual([7, 2, 5, 3, 6, 1, 4]);
      expect(ids(t.where({}, { orderBy: ['age', 'desc'] }))).toEqual([4, 1, 6, 3, 2, 5, 7]);
      expect(ids(t.where({ team: 'core' }, { orderBy: ['age', 'desc'], limit: 2 }))).toEqual([1, 3]);
      expect(ids(t.where({}, { orderBy: 'name', limit: 0 }))).toEqual([]);
      expect(ids(t.where({}, { limit: 3 }))).toEqual([1, 2, 3]);
    },
  },
  {
    group: G4,
    title: 'subscribe fires immediately and on changes to the result',
    run(m, { expect }) {
      const t = seed(m);
      t.createIndex('team');
      const seen: unknown[][] = [];
      const stop = t.subscribe({ team: 'core' }, (rows) => seen.push(ids(rows)));
      expect(seen).toEqual([[1, 3, 5]]);
      t.insert({ id: 7, name: 'Gus', team: 'core' });
      t.update(3, { age: 30 });
      t.update(5, { team: 'web' });
      t.remove(1);
      expect(seen).toEqual([[1, 3, 5], [1, 3, 5, 7], [1, 3, 5, 7], [1, 3, 7], [3, 7]]);
      stop();
      t.remove(3);
      expect(seen.length, 'no calls after unsubscribe').toBe(5);
    },
  },
  {
    group: G4,
    title: 'unrelated writes and no-op updates do not fire',
    run(m, { expect }) {
      const t = seed(m);
      let calls = 0;
      t.subscribe({ team: 'core' }, () => calls++);
      t.insert({ id: 7, name: 'Gus', team: 'web', age: 50 });
      t.update(2, { age: 99 });
      t.remove(4);
      t.update(1, { name: 'Ada' });
      expect(calls, 'only the initial call').toBe(1);
      t.subscribe({ team: 'web' }, () => calls++, { orderBy: 'age', limit: 1 });
      expect(calls).toBe(2);
      t.insert({ id: 8, name: 'Old', team: 'web', age: 80 });
      expect(calls, 'new row falls outside the limit').toBe(2);
      t.insert({ id: 9, name: 'Kid', team: 'web', age: 1 });
      expect(calls).toBe(3);
    },
  },
  {
    group: G4,
    title: 'live queries do not change lastScanned',
    run(m, { expect }) {
      const t = seed(m);
      t.createIndex('team');
      t.where({ team: 'data' });
      t.subscribe({ role: 'dev' }, () => {});
      t.insert({ id: 7, name: 'Gus', role: 'dev' });
      expect(t.lastScanned).toBe(1);
    },
  },
];
