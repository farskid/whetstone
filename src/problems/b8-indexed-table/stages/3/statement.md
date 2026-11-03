Add range queries, compound and unique indexes, and sorting.

```ts
type Range = { $gt?: unknown; $gte?: unknown; $lt?: unknown; $lte?: unknown };
interface FindOptions { orderBy?: string | [string, 'asc' | 'desc']; limit?: number }

class Table<T extends Row> {
  // ...stage 2, changed:
  createIndex(fields: string | string[], opts?: { unique?: boolean }): void;
  where(query: Query, opts?: FindOptions): T[];
}
```

**Ranges**
- In a query, an object whose keys all start with `$` is a range. `$gt`, `$gte`, `$lt` and `$lte` combine with AND. Any other `$` key throws. <!-- tests: range operators, combined bounds, and type bracketing -->
- Ranges only match values of the bound's type: `{ age: { $gt: 5 } }` never matches `'9'`, and never matches `null` or a missing field. <!-- tests: range operators, combined bounds, and type bracketing -->

**Ordering**
- Without `orderBy`, results are in insertion order. `orderBy` sorts by one field (ascending by default). The sort is stable, so ties keep insertion order. <!-- tests: orderBy and limit: stable ties, nulls first ascending, limit after sort -->
- In ascending order, `null` and missing sort first, then booleans, numbers, then strings. Descending is the exact reverse comparison (ties still keep insertion order). <!-- tests: orderBy and limit: stable ties, nulls first ascending, limit after sort -->
- `limit` applies after sorting. `limit: 0` gives `[]`. <!-- tests: orderBy and limit: stable ties, nulls first ascending, limit after sort -->

**Indexes**
- Indexes are sorted. `createIndex(['team', 'age'])` builds a compound index.
- **An index can serve a query** when the query has equality on its first k fields (k ≥ 0) followed by an optional range on the next field, and uses at least one of them. So an index on `['team', 'age']` serves `{ team }`, `{ team, age: 30 }` and `{ team, age: { $gt: 30 } }`, but not `{ age: 30 }`. <!-- tests: compound index: equality prefix plus a range on the next field -->
- `where` still uses the usable index with the fewest candidates (or every row), and `lastScanned` counts those candidates. A range scan covers only values of the bound's type, so `{ $gt: 30 }` on an age index doesn't look at strings. <!-- tests: picks the usable index with the fewest candidates -->
- `unique: true` rejects an insert or update that would give two rows the same full key. The error is thrown before anything changes: the row and every index stay as they were. Keys containing `null` or a missing field are exempt. Creating a unique index over existing duplicates throws. <!-- tests: unique index: rejects duplicates atomically, exempts null and missing -->
