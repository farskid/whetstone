# Masonry layout: incremental

Add a layout that grows as more items load (infinite scroll) and re-flows when the container is resized.

```ts
const m = createMasonry({ containerWidth: 900, minColumnWidth: 200, gutter: 16 });
m.append(firstPage);   // positions of the new items
m.append(secondPage);  // earlier items don't move
m.resize(600);         // everything is laid out again
```

## `createMasonry(options)`

- **`layout`** is the current result, in the same shape as `layout()` returns. With no items it is the empty layout for the options.
- **`append(items)`** places more items **without moving any that are already placed**. The result must be the same as calling `layout` once with every item so far. It returns the new items' positions.
- **`resize(containerWidth)`** keeps the other options and lays every item out again. It returns the new layout.
- Options are validated by `createMasonry` itself, with the same errors as `layout`.

Everything from earlier stages still applies.
