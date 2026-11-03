Add secondary indexes so lookups don't scan the whole table.

```ts
class Table<T extends Row> {
  // ...stage 1, plus:
  createIndex(field: string): void;
}
```

- `createIndex(field)` indexes the existing rows and keeps the index in sync on every insert, update and remove. <!-- tests: the index follows inserts, removes and updates that change the indexed field -->
- Indexed fields hold strings, numbers, booleans or `null`, or are missing. A missing field is indexed as `null`, so `{ team: null }` finds both. <!-- tests: null and missing values are indexed under null -->
- `where` takes its candidate rows from **the index (on a field in the query) that gives the fewest candidates**, or every row if no index helps. It then checks the full query on each candidate. <!-- tests: an equality index scans only the matching rows -->
- `lastScanned` is the number of candidate rows the last `where` looked at. A value with no rows in the index scans 0. <!-- tests: an equality index scans only the matching rows -->
- Results are still in insertion order, whichever index was used.
