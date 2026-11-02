# Text diff

You'll build a small `jsdiff`. This stage is the line diff.

```ts
diffLines('a\nb\nc\n', 'a\nx\nc\n');
// [{ value: 'a\n', count: 1 },
//  { value: 'b\n', count: 1, removed: true },
//  { value: 'x\n', count: 1, added: true },
//  { value: 'c\n', count: 1 }]
```

```ts
interface Change { value: string; count: number; added?: true; removed?: true }

splitLines(text: string): string[]
diffLines(oldText: string, newText: string): Change[]
```

**Lines**
- A line keeps its terminator: `'a\nb'` is the two lines `'a\n'` and `'b'`. So `'b'` and `'b\n'` are different lines.
- `splitLines(text)` returns the lines; `''` has no lines.

**`diffLines`**
- `value` is the joined text of the run, and `count` is its number of lines.
- The changes must be **minimal**: the number of removed plus added lines is as small as possible.
- Joining the non-added values gives `oldText`, and joining the non-removed values gives `newText`.
- Consecutive changes of the same kind are merged.
- Between two unchanged runs, removals come **before** additions.
- Only `true` is ever stored in `added` / `removed`; when a flag doesn't apply, the key is left out.
- Identical texts give one unchanged change (or `[]` when both are empty).
- Inputs in this stage are small (a few dozen lines).
