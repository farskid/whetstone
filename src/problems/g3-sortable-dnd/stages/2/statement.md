# Sortable drag-and-drop: several selected items

Add dragging several selected items at once.

```ts
moveMany(['a', 'b', 'c', 'd', 'e'], [3, 1], 0); // ['b', 'd', 'a', 'c', 'e']
```

```ts
moveMany<T>(list: readonly T[], selected: readonly number[], toIndex: number): T[]
getDropIndexMany(rects: readonly Rect[], selected: readonly number[], pointerY: number): number
```

- **`moveMany(list, selected, toIndex)`** moves the items at the `selected` indices as one block:
  1. Take the selected items out, keeping their **original relative order**. The order of `selected` doesn't matter, and duplicate indices count once.
  2. Insert the block at `toIndex` of the remaining list, where `0 ≤ toIndex ≤ remaining.length`.
- **`getDropIndexMany(rects, selected, pointerY)`** returns the `toIndex` for a pointer position. It works like `getDropIndex`, but excludes every selected item.

An out-of-range index throws a `RangeError`.

Everything from earlier stages still applies.
