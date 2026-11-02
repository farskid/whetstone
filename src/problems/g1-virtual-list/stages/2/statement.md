# Virtual list: variable and measured sizes

Rows can now have different sizes, a gap between them, and a real size that replaces the estimate once the DOM has measured it.

```ts
const v = createVirtualizer({ count: 100, estimateSize: (i) => 20 + (i % 3) * 10, viewportHeight: 100, gap: 4 });
v.measure(1, 120);       // row 1 is really 120px tall; later rows move down
v.getVirtualItems(95);
```

## API changes

```ts
createVirtualizer(options: {
  // ...as before, plus:
  gap?: number;       // default 0, space between consecutive rows
}): {
  // ...as before, plus:
  measure(index: number, size: number): void;
};
```

## Rules

- A row's size is its measured size if `measure` has been called for it. Otherwise it's `estimateSize(index)`.
- `start(0) = 0`, and `start(i + 1) = end(i) + gap`.
- `getTotalSize()` is `end(count - 1)` (no trailing gap), or `0` when the list is empty.
- If `scrollTop` falls inside a gap, the first visible row is the next one.
- `measure` records the real size of row `index`. Measuring the same size again changes nothing. An index outside `[0, count - 1]` is ignored.
- Everything from earlier stages still applies.
