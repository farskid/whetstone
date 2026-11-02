Add snapshots, and make the whole thing fast.

```ts
class TextBuffer {
  // ...stage 3, plus:
  snapshot(): { readonly length: number; getText(): string };
}
```

- `snapshot()` must be O(1): don't copy the text or the piece list when you take it.
- Later edits to the buffer must not change what any earlier snapshot returns.
- **Performance:** there are timed tests with a multi-megabyte document and thousands of edits (with `positionAt`/`offsetAt` between them), plus 10k random edits with `\r`, `\n` and emoji, checked against a plain string.
