# Fuzzy search: scoring

Add a `score`, and choose the **best** alignment instead of the earliest one.

```ts
fuzzyMatch('ab', 'a_b_ab'); // { score: 49, positions: [4, 5] }  ([0, 2] would score 48)
fuzzyMatch('fb', 'fooBar'); // { score: 46, positions: [0, 3] }
```

```ts
interface Match { score: number; positions: number[] }
export const SCORE = { match: 16, start: 10, separator: 9, boundary: 8, consecutive: 8, gapStart: 3, gapExtend: 1, typo: 10 };
```

| Component | Points |
| --- | --- |
| Each matched character | +16 |
| Boundary bonus: the match is the first character of the text | +10 |
| Boundary bonus: the previous character is a separator (whitespace, `_ - / . :`) | +9 |
| Boundary bonus: lower→Upper camelCase, or a change between digit and non-digit (non-separator) characters | +8 |
| Consecutive bonus: the match directly follows the previous match | +8 |
| Gap of `g ≥ 1` skipped characters between two matches | −(3 + (g − 1)) |

- A character gets at most one boundary bonus, the first one in the table that applies.
- Boundary rules look at the **original** text, so camelCase still counts after folding. Upper after upper (`AB`) is not camelCase.
- Characters skipped before the first match or after the last are free.
- Report the alignment with the **highest** score. If several tie, take the one whose positions come first: compare the first position, then the second, and so on.
- An empty query scores `0`.
- Text can be a few hundred characters long, so don't try every alignment. Dynamic programming does it in O(query × text).
- Everything from earlier stages still applies.
