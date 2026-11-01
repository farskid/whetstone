# Fuzzy search

Build the matcher behind a command palette.

## `fuzzyMatch(query, text)` → `{ score, positions, ranges } | null`

**Folding.** Both strings are folded before comparing:
- NFD-normalize;
- remove combining marks (U+0300–U+036F);
- lowercase.

So `cafe` matches `Café`.

**Matching.** The query matches if its folded characters appear in order in the text, not necessarily adjacent. Otherwise return `null`. An empty query matches with score `0` and no positions.

### Scoring an alignment

| Component | Points |
| --- | --- |
| Each matched character | +16 |
| Boundary bonus: the match is the first character of the text | +10 |
| Boundary bonus: the previous character is a separator (whitespace, `_ - / . :`) | +9 |
| Boundary bonus: lower→Upper camelCase, or a change between digit and non-digit (non-separator) characters | +8 |
| Consecutive bonus: the match directly follows the previous match | +8 |
| Gap of `g ≥ 1` skipped characters between two matches | −(3 + (g − 1)) |

- A character gets at most one boundary bonus.
- Boundary rules look at the **original** text, so camelCase still counts after folding.
- Characters skipped before the first match or after the last are free.

Examples:
- `"ab"` in `"a_b_ab"` scores 49 at positions `[4, 5]`, which beats `[0, 2]` at 48.
- `"fb"` in `"fooBar"` scores 26 + 20 = 46.

**Choosing the alignment.**
- Report the alignment with the **highest** score.
- If several tie, take the one whose positions come first: compare the first position, then the second, and so on.
- Text can be a few hundred characters long, so don't try every alignment. Dynamic programming does it in O(query × text).

**Positions and ranges.**
- `positions` are ascending indices into the **original** `text`.
- `ranges` merges adjacent positions into half-open `[start, end)` pairs.

## `search(items, query, { keys?, typo?, limit? })`

**What gets matched.**
- Without `keys`, the items are strings.
- With `keys`, each key is a property name or `{ name, weight = 1 }`. Non-string values are skipped.

**Item score.**
- An item's score is the **best** of `match.score × weight` across its keys.
- The result reports that `key`; the first key wins ties.

**Results.**
- Results are `{ item, refIndex, key?, score, positions, ranges }` for matching items only.
- They are sorted by score, highest first. Ties keep the input order.
- `limit` caps the count.

**`typo: true`.**
- When the whole query does not match a value and the query has at least 3 characters, try the query with any **one** character deleted.
- Use the best such match, minus 10 points.
- A value that matches exactly never uses the typo path.
