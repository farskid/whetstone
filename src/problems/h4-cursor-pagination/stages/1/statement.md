# Cursor pagination: paging

APIs like GitHub's GraphQL API return lists one page at a time. Each page comes with a cursor that points to where the next page starts. Build a generator that walks every page for you.

```ts
const gen = paginate((cursor) => api.listRepos({ after: cursor }));
for await (const repo of gen) {
  if (repo.name === 'whetstone') break; // no more pages are fetched
}
gen.cursor; // pass back as startCursor to carry on later
```

## Paging

`paginate(fetchPage, options?)` returns an async generator. `fetchPage(cursor)` resolves to `{ items, endCursor, hasNextPage }`. The first call gets `options.startCursor`, which defaults to `null`.

- **What it yields.** Every item, in order, page by page, until a page has `hasNextPage: false`. Empty pages are fine: just keep going. <!-- tests: yields every item across pages, in order | empty pages and startCursor -->
- **Lazy.** Nothing is fetched until you start iterating, and the next page is fetched only when you ask for the item after the current page.
- **`break`.** Stopping the loop means no more fetches. <!-- tests: break stops fetching -->
- **`.cursor`.** The generator has a `.cursor` property, which you can pass back as `startCursor` to carry on later.
  - It starts as the start cursor.
  - It moves to a page's `endCursor` only after **every item of that page** has been yielded. If you stop part-way through a page, `.cursor` still points at that page, so resuming fetches it again.

You can assume every page with `hasNextPage: true` has a new, non-null `endCursor`. Items are yielded as they come, duplicates included.
