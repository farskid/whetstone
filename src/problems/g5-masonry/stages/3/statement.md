# Masonry layout: spans

Items can now span several adjacent columns.

```ts
const r = layout([{ height: 10 }, { height: 80 }, { height: 20 }, { height: 30 }, { height: 50, span: 2 }], { containerWidth: 400, columnCount: 4 });
r.positions[4]; // { x: 200, y: 30, width: 200, height: 50, column: 2, span: 2 }
```

- **`span`** is optional on any item and defaults to 1. It must be a positive integer, or it throws a `RangeError`. A span larger than the column count is capped at the column count.
- **Width.** An item spanning `s` columns is `s × columnWidth + (s − 1) × gutter` wide. For an `aspectRatio` item, the height comes from this full width.
- **Placement.** For each run of `span` adjacent columns, the item would sit at the tallest column in that run. Pick the run where it sits lowest, using the leftmost run on a tie. Every column the item covers now ends at `y + height + gutter`.
- **Result.** Each position gains `span` (after capping). `column` is the leftmost column the item covers.

Everything from earlier stages still applies.
