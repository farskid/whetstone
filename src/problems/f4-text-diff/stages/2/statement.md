# Text diff: unified patch

Add unified patches: `structuredPatch` builds the hunks and `createPatch` formats them.

```ts
createPatch('f.txt', 'a\nb\nc\n', 'a\nx\nc\n');
// '--- f.txt\n+++ f.txt\n@@ -1,3 +1,3 @@\n a\n-b\n+x\n c\n'
```

```ts
interface Hunk { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }
interface StructuredPatch { oldFileName: string; newFileName: string; hunks: Hunk[] }

structuredPatch(oldFileName, newFileName, oldText, newText, options?: { context?: number }): StructuredPatch
createPatch(fileName, oldText, newText, options?: { context?: number }): string
```

**Lines**
- `lines` holds `' '`, `'-'` and `'+'` prefixed lines without their `\n`, in the order of the line diff.
- Each line that has no terminator is followed by the marker `'\ No newline at end of file'` (exported as `NO_NEWLINE`).

**Hunk boundaries**
- `context` defaults to 3. A hunk includes up to `context` unchanged lines before and after its changes.
- Two changes separated by at most `2 * context` unchanged lines share a hunk.

**Start numbers**
- Starts are 1-based.
- An empty side (`oldLines` or `newLines` is `0`) uses the number of the line *before* the hunk, which is `0` at the top of the file.

**`createPatch`** formats the patch as text, with both file names set to `fileName`. Every line ends in `\n`:

```
--- fileName
+++ fileName
@@ -oldStart,oldLines +newStart,newLines @@
 context
-removed
+added
```

- Both numbers always appear, even when they are `1` or `0`.
- Identical inputs produce `''` (and `structuredPatch` returns no hunks).
