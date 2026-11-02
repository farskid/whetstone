# Fuzzy search

You'll build the matcher behind a command palette. This stage decides **whether** a query matches.

```ts
fuzzyMatch('gst', 'git status'); // { positions: [0, 4, 5] }
fuzzyMatch('tsg', 'git status'); // null
```

```ts
interface Match { positions: number[] }

fuzzyMatch(query: string, text: string): Match | null
```

**Folding.** Fold both strings before comparing:
- NFD-normalize;
- remove combining marks (U+0300–U+036F);
- lowercase.

So `cafe` matches `Café` and `Cre\u0300me`.

**Matching**
- The query matches if its folded characters appear in order in the folded text. They don't have to be adjacent. Otherwise return `null`.
- In this stage, match each query character at the **earliest** possible place after the previous one.
- `positions` are ascending indices into the **original** `text`, so a combining mark you removed still counts in the indices. When several folded characters come from one original character, list its index once.
- An empty query matches with `positions: []`.
