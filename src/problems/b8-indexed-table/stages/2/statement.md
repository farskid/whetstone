Add secondary indexes so lookups don't scan the whole table.

```ts
class Table<T extends Row> {
  // ...stage 1, plus:
  createIndex(field: string): void;
}
```

- `createIndex(field)` indexes the existing rows and keeps the index in sync on every insert, update and remove.
- Indexed fields hold strings, numbers, booleans or `null`, or are missing. A missing field is indexed as `null`, so `{ team: null }` finds both.
- `where` takes its candidate rows from **the index (on a field in the query) that gives the fewest candidates**, or every row if no index helps. It then checks the full query on each candidate.
- `lastScanned` is the number of candidate rows the last `where` looked at. A value with no rows in the index scans 0.
- Results are still in insertion order, whichever index was used.
