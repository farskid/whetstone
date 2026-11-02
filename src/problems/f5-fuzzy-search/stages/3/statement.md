# Fuzzy search: highlights

Add `ranges` for highlighting, and keep matching fast on long texts.

```ts
fuzzyMatch('gus', 'get_user_status');
// { score: …, positions: [0, 4, 5], ranges: [[0, 1], [4, 6]] }
```

```ts
interface Match { score: number; positions: number[]; ranges: [number, number][] }
```

- `ranges` merges adjacent positions into half-open `[start, end)` pairs, in order.
- An empty query gives `{ score: 0, positions: [], ranges: [] }`.
- Texts can be several hundred characters long and are matched many times. Fifty matches against a 600-character text must finish well within a second.
- Everything from earlier stages still applies.
