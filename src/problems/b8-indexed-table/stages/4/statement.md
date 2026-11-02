Add live queries.

```ts
const stop = users.subscribe({ team: 'core' }, (rows) => render(rows), { orderBy: 'age' });

class Table<T extends Row> {
  // ...stage 3, plus:
  subscribe(query: Query, cb: (rows: T[]) => void, opts?: FindOptions): () => void;
}
```

- `subscribe` calls `cb` right away with the current result, and returns an unsubscribe function. After unsubscribing, `cb` is never called again.
- After each insert, update or remove, every subscription re-runs its query. `cb` fires only if the result changed: a different length, or a different row object at any position.
- Updates create new row objects, so editing a row in the result counts as a change. Editing a row outside the result does not, and neither does a no-op update. With `limit`, a new row that falls outside the limit isn't a change.
- `subscribe` and its re-runs don't change `lastScanned`. Only `where` does.
