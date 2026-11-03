Add snapshots, and make the whole thing fast.

```ts
class TextBuffer {
  // ...stage 3, plus:
  snapshot(): { readonly length: number; getText(): string };
}
```

- `snapshot()` must be O(1): don't copy the text or the piece list when you take it. <!-- tests: perf: snapshot after every edit stays O(1) -->
- Later edits to the buffer must not change what any earlier snapshot returns. <!-- tests: snapshots are unaffected by later edits -->
- **Performance:** there are timed tests with a multi-megabyte document and thousands of edits (with `positionAt`/`offsetAt` between them), plus 10k random edits with `\r`, `\n` and emoji, checked against a plain string. <!-- tests: perf: thousands of edits on a 4 MB document | 10k random edits match a plain string -->
