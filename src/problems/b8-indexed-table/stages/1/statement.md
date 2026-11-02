Build the core of a client-side database such as minimongo or Dexie. Start with a table of rows and simple equality queries.

```ts
const users = new Table<User>();
users.insert({ id: 1, name: 'Ada', team: 'core', age: 36 });
users.update(1, { age: 37 });
users.where({ team: 'core' });   // [{ id: 1, name: 'Ada', team: 'core', age: 37 }]
users.lastScanned;               // 1: rows the query looked at
```

```ts
type Id = string | number;
type Row = { id: Id } & Record<string, unknown>;
type Query = Record<string, unknown>;   // field -> value

class Table<T extends Row> {
  insert(row: T): T;
  get(id: Id): T | undefined;
  update(id: Id, patch: Partial<T>): T;
  remove(id: Id): boolean;
  where(query: Query): T[];
  lastScanned: number;   // starts at 0
}
```

**Rows**
- `insert` stores a frozen shallow copy and returns it. Later changes to the object you passed in don't affect the table. A duplicate `id` throws.
- `update` returns a new frozen row `{ ...old, ...patch }` that replaces the old one. It throws for an unknown id, or for a patch that changes `id`. If every patched field already has that value (`Object.is`), nothing changes and the old row object is returned.
- `remove` returns whether a row was removed. `get` of a missing id returns `undefined`.

**Queries**
- A row matches when every field in the query matches. `{}` matches every row.
- A value matches by `===`. `null` (or `undefined`) matches rows where the field is `null` or missing.
- Results come back in insertion order.
- There are no indexes yet, so `where` looks at every row. `lastScanned` is the number of rows the last `where` looked at.
