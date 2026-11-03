# Text diff: words and scale

Add a word diff, and make the diff fast on large files.

```ts
diffWords('the quick fox', 'the slow fox');
// [{ value: 'the ', count: 2 }, { value: 'quick', count: 1, removed: true },
//  { value: 'slow', count: 1, added: true }, { value: ' fox', count: 2 }]
```

```ts
diffWords(oldText: string, newText: string): Change[]
```

- `diffWords` follows the same rules as `diffLines`, but the tokens are words and runs of whitespace. Each word and each whitespace run is one token, and `count` counts tokens. <!-- tests: diffWords works on words and whitespace runs -->
- **Scale**: diffing two 10,000-line files that differ in a few dozen places, and creating and applying their patch, must be fast. The tests give it a time budget. Myers' O((N+M)·D) algorithm is the classic choice. <!-- tests: 10,000 lines with 40 edits diff and patch within 1.5s -->
