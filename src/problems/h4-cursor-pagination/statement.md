# Cursor pagination

APIs like GitHub's GraphQL API return lists one page at a time. Each page comes with a cursor that points to where the next page starts. **Relay connections** standardize this as `edges` and `pageInfo`. Build two tools: a generator that walks every page, and a feed that a UI can scroll in both directions.

## Paging

`paginate(fetchPage, options?)` returns an async generator. `fetchPage(cursor)` resolves to `{ items, endCursor, hasNextPage }`. The first call gets `options.startCursor`, which defaults to `null`.

- **What it yields.** Every item, in order, page by page, until a page has `hasNextPage: false`. Empty pages are fine: just keep going.
- **Lazy.** Nothing is fetched until you start iterating, and the next page is fetched only when you ask for the item after the current page.
- **`break`.** Stopping the loop means no more fetches.
- **`.cursor`.** The generator has a `.cursor` property, which you can pass back as `startCursor` to carry on later.
  - It starts as the start cursor.
  - It moves to a page's `endCursor` only after **every item of that page** has been yielded. If you stop part-way through a page, `.cursor` still points at that page, so resuming fetches it again.

## Dedupe and guards

- **Dedupe.** Data can shift while you page, so an item can show up twice. Skip any item whose id was already yielded. The id comes from `options.getId(item)`, which defaults to `item.id`.
- **Loop guard.** A page whose `hasNextPage` is true would loop forever if:
  - its `endCursor` is `null`, or
  - its `endCursor` was already used, and the start cursor counts as used.

  In either case, throw an `Error` as soon as that page arrives, before yielding any of its items. For a repeated cursor, the message must contain "repeat".
- **Errors.** If `fetchPage` rejects, the generator throws that error. `.cursor` still points at the page that failed, so `paginate(fetchPage, { startCursor: gen.cursor })` resumes there.

## Bidirectional feed

`createFeed({ fetchPage, pageSize, maxItems?, getId? })` holds one list, ordered **newest first**. `fetchPage(args)` returns a Relay connection: `{ edges: [{ cursor, node }], pageInfo: { hasNextPage, hasPreviousPage } }`. The edges are always newest first.

- **State.** `feed.items` is the list of nodes. `hasOlder` starts as `true` and `hasNewer` as `false`.
- **`loadOlder()`**
  - Fetches `{ first: pageSize, after }`, where `after` is the last edge's cursor, or `null` for an empty list.
  - Adds the new edges at the end, and sets `hasOlder` from `pageInfo.hasNextPage`.
  - Does nothing when `hasOlder` is false.
- **`loadNewer()`**
  - Fetches `{ last: pageSize, before }`, where `before` is the first edge's cursor.
  - Adds the new edges at the front, and sets `hasNewer` from `pageInfo.hasPreviousPage`.
  - Does nothing when the list is empty. Otherwise it always fetches, so it can be used to poll.
- **Dedupe.** A node whose id is already in the list is not added again.
- **`maxItems`** (default `Infinity`). When the list grows past it, remove items from the **other end**:
  - `loadOlder` drops the newest items and sets `hasNewer = true`.
  - `loadNewer` and inserts drop the oldest items and set `hasOlder = true`.
- **One request per direction.** Calling `loadOlder()` while one is still running returns the **same promise**, and the same goes for `loadNewer()`.
- **Failures.** A failed load rejects and leaves the list and flags exactly as they were, so it can simply be retried.

## Live updates

`feed.apply(event)` changes the list without fetching anything.

- **`{ type: 'insert', edge }`** adds the edge at the top, then applies the `maxItems` rule.
  - It is ignored when `hasNewer` is true, because the top of the list isn't loaded and the insert would leave a gap.
  - It is also ignored when that id is already in the list.
- **`{ type: 'update', node }`** replaces the node with the same id. If there's no such node, nothing happens.
- **`{ type: 'delete', id }`** removes that node, if it's there.
