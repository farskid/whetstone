# In-memory table with indexes

Build the core of a client-side database such as minimongo or Dexie: a table of rows, secondary indexes that make lookups cheap, and live queries.

```ts
const users = new Table<User>();
users.createIndex('team');
users.createIndex('email', { unique: true });
users.insert({ id: 1, name: 'Ada', team: 'core', age: 36, email: 'ada@x.io' });

users.where({ team: 'core', age: { $gte: 30 } }, { orderBy: ['age', 'desc'], limit: 10 });
users.lastScanned; // rows the query had to look at

const stop = users.subscribe({ team: 'core' }, (rows) => render(rows));
```

## API

```ts
type Id = string | number;
type Row = { id: Id } & Record<string, unknown>;
type Query = Record<string, unknown>; // field -> value, or field -> { $gt?, $gte?, $lt?, $lte? }
interface FindOptions { orderBy?: string | [string, 'asc' | 'desc']; limit?: number }

class Table<T extends Row> {
  insert(row: T): T;
  get(id: Id): T | undefined;
  update(id: Id, patch: Partial<T>): T;
  remove(id: Id): boolean;
  createIndex(fields: string | string[], opts?: { unique?: boolean }): void;
  where(query: Query, opts?: FindOptions): T[];
  lastScanned: number;
  subscribe(query: Query, cb: (rows: T[]) => void, opts?: FindOptions): () => void;
}
```

## Rows

- `insert` stores a frozen shallow copy and returns it. A duplicate `id` throws.
- `update` returns a new frozen row `{ ...old, ...patch }` that replaces the old one. It throws for an unknown id or a patch that changes `id`. If every patched field already has that value (`Object.is`), nothing changes and the old row object is returned.
- `remove` returns whether a row was removed.
- Indexed fields hold strings, numbers, booleans or `null`, or are missing. A missing field counts as `null`.

## Queries

- A plain value matches by `===`. `null` (or `undefined`) matches rows where the field is `null` or missing.
- An object whose keys all start with `$` is a range. `$gt`, `$gte`, `$lt` and `$lte` combine with AND. Any other `$` key throws.
- Ranges only match values of the bound's type: `{ age: { $gt: 5 } }` never matches `'9'`, and never matches `null` or a missing field.
- All fields in the query must match.
- Results come back in insertion order. `orderBy` sorts by one field. The sort is stable, so ties keep insertion order. In ascending order `null` and missing sort first, then booleans, numbers, then strings. `limit` applies after sorting.

## Indexes

- `createIndex('team')` or `createIndex(['team', 'role'])` builds a sorted index over existing rows and keeps it in sync on every insert, update and remove.
- **An index can serve a query** when the query has equality on its first k fields (k ≥ 0) followed by an optional range on the next field, and uses at least one of them. So an index on `['team', 'age']` serves `{ team }`, `{ team, age: 30 }` and `{ team, age: { $gt: 30 } }`, but not `{ age: 30 }`.
- `where` looks at the candidate rows from **the usable index that gives the fewest candidates**, or every row if no index helps, then checks the full query on each.
- `lastScanned` is the number of candidate rows the last `where` looked at. `subscribe` and its re-runs don't change it.
- `unique: true` rejects an insert or update that would give two rows the same full key. The table stays unchanged. Keys containing `null` or a missing field are exempt. Creating a unique index over existing duplicates throws.

## Live queries

- `subscribe` calls `cb` right away with the current result, and returns an unsubscribe function.
- After each insert, update or remove, every subscription re-runs. `cb` fires only if the result changed: a different length, or a different row object at any position. Because updates create new row objects, editing a row in the result counts as a change. Editing a row outside the result does not.
