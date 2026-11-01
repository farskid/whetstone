# Masonry layout

A masonry grid (think Pinterest) stacks cards of different heights into columns. Each new card goes wherever the stack is currently shortest, so the columns stay roughly even. Here you'll write the layout math. You get sizes and return positions, with no DOM involved.

## `layout(items, options)`

### Options

```ts
{ containerWidth, gutter = 0, columnCount?, minColumnWidth? }
```

Give **exactly one** of `columnCount` or `minColumnWidth`. Giving both, or neither, throws a `TypeError`.

### Columns

- **`columnCount`** must be a positive integer. Otherwise it throws a `RangeError`.
- **`minColumnWidth`** must be positive. It asks for as many columns as fit, and always at least one: `max(1, floor((containerWidth + gutter) / (minColumnWidth + gutter)))`.
- **Gutters.** There is a `gutter` between neighbouring columns, and below every item. There's none at the outer edges.
- **Width.** Each column is `(containerWidth − gutter × (columnCount − 1)) / columnCount` wide. Column `c` starts at `x = c × (columnWidth + gutter)`.
- A negative `containerWidth` or `gutter` throws a `RangeError`.

### Items

An item is `{ height, span? }` or `{ aspectRatio, span? }`. `aspectRatio` is width ÷ height, so that item's height is `width / aspectRatio`.

- **`span`** defaults to 1. It's capped at the column count, and it must be a positive integer.
- **Width.** An item spanning `s` columns is `s × columnWidth + (s − 1) × gutter` wide.
- A negative or non-finite height throws a `RangeError`, and so does a bad span.

### Placement

Place the items in order:

- **One column.** Put the item at the top of the **shortest** column. On a tie, use the leftmost.
- **Several columns.** For each run of `span` adjacent columns, the item would sit at the tallest column in that run. Pick the run where it sits lowest, using the leftmost run on a tie.
- **Bookkeeping.** Every column the item covers now ends at `y + height + gutter`.

### Result

The result is `{ columnCount, columnWidth, positions, height }`.

- **`positions`** has one `{ x, y, width, height, column, span }` per item, in input order. `column` is the leftmost column the item covers.
- **`height`** is the bottom of the tallest column, without the trailing gutter. It is `0` when there are no items.

## `createMasonry(options)`

This gives you a layout that grows:

- **`layout`** is the current result, in the same shape as above.
- **`append(items)`** places more items **without moving any that are already placed**. The result must be the same as calling `layout` once with every item. It returns the new items' positions.
- **`resize(containerWidth)`** keeps the other options and lays every item out again. It returns the new layout.
