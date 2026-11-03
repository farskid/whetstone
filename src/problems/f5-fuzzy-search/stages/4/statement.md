# Fuzzy search: ranking

Add `search(items, query, { keys?, typo?, limit? })`.

```ts
search(['git status', 'gist', 'go'], 'gst');
// [{ item: 'git status', refIndex: 0, score: …, positions: […], ranges: […] }, { item: 'gist', refIndex: 1, … }]
```

```ts
interface SearchKey { name: string; weight?: number }
interface SearchOptions { keys?: (string | SearchKey)[]; typo?: boolean; limit?: number }
interface SearchResult<T> extends Match { item: T; refIndex: number; key?: string }

search<T>(items: T[], query: string, options?: SearchOptions): SearchResult<T>[]
```

**What gets matched**
- Without `keys`, the items are strings.
- With `keys`, each key is a property name or `{ name, weight = 1 }`. Values that aren't strings are skipped.

**Item score**
- An item's score is the **best** `match.score × weight` across its keys. <!-- tests: weighted keys: best weighted key wins and is reported -->
- The result reports that `key`, and the first key wins ties. String items have no `key`. <!-- tests: weighted keys: best weighted key wins and is reported -->

**Results**
- Return only matching items. `refIndex` is the item's index in `items`.
- Sort by score, highest first. Ties keep the input order. <!-- tests: results are sorted by score, ties keep input order, limit applies -->
- `limit` caps the count. <!-- tests: results are sorted by score, ties keep input order, limit applies -->

**`typo: true`**
- When the whole query doesn't match a value and the query has at least 3 characters, try the query with any **one** character deleted. <!-- tests: typo mode tolerates one extra query character at −10 -->
- Use the best such match, minus 10 points. <!-- tests: typo mode tolerates one extra query character at −10 -->
- A value that matches exactly never uses the typo path.

Everything from earlier stages still applies.
