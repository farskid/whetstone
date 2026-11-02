# Masonry layout: responsive columns

Let the column count follow the container width, and let items size themselves from an aspect ratio.

```ts
layout(items, { containerWidth: 660, minColumnWidth: 200, gutter: 20 }).columnCount; // 3
layout([{ aspectRatio: 2 }], { containerWidth: 400, columnCount: 2 }).positions[0].height; // 100
```

## Options

```ts
{ containerWidth, gutter = 0, columnCount?, minColumnWidth? }
```

- Give **exactly one** of `columnCount` or `minColumnWidth`. Giving both, or neither, throws a `TypeError`.
- **`minColumnWidth`** must be positive, or it throws a `RangeError`. It asks for as many columns as fit, and always at least one: `max(1, floor((containerWidth + gutter) / (minColumnWidth + gutter)))`.

## Items

An item is now `{ height }` or `{ aspectRatio }`. `aspectRatio` is width ÷ height, so that item's height is `columnWidth / aspectRatio`. An `aspectRatio` of 0 gives an infinite height, which throws a `RangeError` like any non-finite height.

Everything from earlier stages still applies.
