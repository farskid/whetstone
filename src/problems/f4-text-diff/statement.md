# Text diff

Build a small `jsdiff`: line and word diffs, unified patches, and applying them.

## Lines
A **line** keeps its terminator: `'a\nb'` is the two lines `'a\n'` and `'b'`. So `'b'` and `'b\n'` are different lines. `splitLines(text)` returns them; `''` has no lines.

## `diffLines(oldText, newText)` → `Change[]`

Each `Change` is `{ value, count, added?, removed? }`:
- `value` is the joined text;
- `count` is the number of lines.

The rules:
- The changes must be **minimal**: the number of removed plus added lines is as small as possible.
- Joining the non-added values gives `oldText`, and joining the non-removed values gives `newText`.
- Consecutive changes of the same kind are merged.
- Between two unchanged runs, removals come **before** additions.
- Only `true` is ever stored in `added` / `removed`; when a flag doesn't apply, the key is left out.

## `diffWords(oldText, newText)`

The same as `diffLines`, but the tokens are words and runs of whitespace. Each word and each whitespace run is one token.

## `structuredPatch(oldName, newName, oldText, newText, { context = 3 })`

Returns `{ oldFileName, newFileName, hunks }`. Each hunk is `{ oldStart, oldLines, newStart, newLines, lines }`.

**Lines.**
- `lines` holds `' '`, `'-'` and `'+'` prefixed lines without their `\n`.
- Each line that has no terminator is followed by the marker `'\ No newline at end of file'`.

**Hunk boundaries.**
- A hunk includes up to `context` unchanged lines before and after its changes.
- Two changes separated by at most `2 * context` unchanged lines share a hunk.

**Start numbers.**
- Starts are 1-based.
- An empty side (`oldLines` or `newLines` is `0`) uses the number of the line *before* the hunk, which is `0` at the top of the file.

## `createPatch(fileName, oldText, newText, opts?)`

Formats the patch as text. Every line ends in `\n`:

```
--- fileName
+++ fileName
@@ -oldStart,oldLines +newStart,newLines @@
 context
-removed
+added
```

Both numbers always appear, even when they are `1` or `0`. Identical inputs produce `''`.

## `applyPatch(source, patch)`

`patch` is the text from `createPatch` or a structured patch. Apply the hunks in order.

**Finding the spot.**
- Each hunk's context and removed lines (with their exact terminators) must match the source.
- Look first where the hunk says, adjusted by how far earlier hunks moved. If it doesn't match there, try positions 1, 2, 3… lines away. At each distance, check earlier positions first.

**Conflicts.** A hunk that matches nowhere throws.

## Scale
Diffing two 10,000-line files that differ in a few dozen places must be fast. The tests give it a time budget. Myers' O((N+M)·D) algorithm is the classic choice.
