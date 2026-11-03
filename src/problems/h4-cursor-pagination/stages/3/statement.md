# Cursor pagination: bidirectional feed

A UI timeline scrolls both ways and receives live events. Build a feed over **Relay connections**, which standardize pages as `edges` and `pageInfo`.

```ts
const feed = createFeed({ fetchPage, pageSize: 20 });
await feed.loadOlder(); // the newest 20 posts
await feed.loadNewer(); // anything posted since
feed.apply({ type: 'delete', id: 7 });
```

## Bidirectional feed

`createFeed({ fetchPage, pageSize, maxItems?, getId? })` holds one list, ordered **newest first**. `fetchPage(args)` returns a Relay connection: `{ edges: [{ cursor, node }], pageInfo: { hasNextPage, hasPreviousPage } }`. The edges are always newest first.

- **State.** `feed.items` is the list of nodes. `hasOlder` starts as `true` and `hasNewer` as `false`.
- **`loadOlder()`**
  - Fetches `{ first: pageSize, after }`, where `after` is the last edge's cursor, or `null` for an empty list.
  - Adds the new edges at the end, and sets `hasOlder` from `pageInfo.hasNextPage`. <!-- tests: loadOlder pages forward until hasNextPage is false -->
  - Does nothing when `hasOlder` is false. <!-- tests: loadOlder pages forward until hasNextPage is false -->
- **`loadNewer()`**
  - Fetches `{ last: pageSize, before }`, where `before` is the first edge's cursor. <!-- tests: loadNewer prepends with last/before and dedupes -->
  - Adds the new edges at the front, and sets `hasNewer` from `pageInfo.hasPreviousPage`. <!-- tests: loadNewer prepends with last/before and dedupes -->
  - Does nothing when the list is empty. Otherwise it always fetches, so it can be used to poll.
- **Dedupe.** A node whose id is already in the list is not added again. <!-- tests: loadNewer prepends with last/before and dedupes -->
- **`maxItems`** (default `Infinity`). When the list grows past it, remove items from the **other end**: <!-- tests: maxItems evicts from the far end -->
  - `loadOlder` drops the newest items and sets `hasNewer = true`.
  - `loadNewer` and inserts drop the oldest items and set `hasOlder = true`.
- **One request per direction.** Calling `loadOlder()` while one is still running returns the **same promise**, and the same goes for `loadNewer()`. <!-- tests: concurrent loads share one request; a failed load changes nothing -->
- **Failures.** A failed load rejects and leaves the list and flags exactly as they were, so it can simply be retried. <!-- tests: concurrent loads share one request; a failed load changes nothing -->

## Live updates

`feed.apply(event)` changes the list without fetching anything. <!-- tests: insert, update and delete events -->

- **`{ type: 'insert', edge }`** adds the edge at the top, then applies the `maxItems` rule.
  - It is ignored when `hasNewer` is true, because the top of the list isn't loaded and the insert would leave a gap.
  - It is also ignored when that id is already in the list.
- **`{ type: 'update', node }`** replaces the node with the same id. If there's no such node, nothing happens.
- **`{ type: 'delete', id }`** removes that node, if it's there.

`paginate` from earlier stages stays as it is.
