# Masonry layout

A masonry grid (think Pinterest) stacks cards of different heights into columns. Each new card goes wherever the stack is currently shortest, so the columns stay roughly even. Here you'll write the layout math. You get sizes and return positions, with no DOM involved.

This stage uses a fixed number of columns and items with fixed heights.

```ts
const r = layout([{ height: 100 }, { height: 50 }, { height: 80 }, { height: 30 }], { containerWidth: 300, columnCount: 3 });
r.positions[3]; // { x: 100, y: 50, width: 100, height: 30, column: 1 }
r.height;       // 100
```

## `layout(items, { containerWidth, columnCount, gutter = 0 })`

### Columns

- **`columnCount`** must be a positive integer. Otherwise it throws a `RangeError`.
- **Gutters.** There is a `gutter` between neighbouring columns, and below every item. There's none at the outer edges.
- **Width.** Each column is `(containerWidth − gutter × (columnCount − 1)) / columnCount` wide. Column `c` starts at `x = c × (columnWidth + gutter)`. Compute `x` with this formula rather than by adding widths, so rounding doesn't build up.
- A negative `containerWidth` or `gutter` throws a `RangeError`.

### Items

An item is `{ height }`. Every item is one column wide. A negative or non-finite height throws a `RangeError`.

### Placement

Place the items in order. Put each item at the top of the **shortest** column. On a tie, use the leftmost. That column now ends at `y + height + gutter`.

### Result

The result is `{ columnCount, columnWidth, positions, height }`.

- **`positions`** has one `{ x, y, width, height, column }` per item, in input order.
- **`height`** is the bottom of the tallest column, without the trailing gutter. It is `0` when there are no items.
