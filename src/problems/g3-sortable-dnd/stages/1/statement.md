# Sortable drag-and-drop

Libraries like **dnd-kit** keep the DOM work separate from a small amount of pure math, and the math is what you'll build here. Rects are plain `{ top, height }` objects measured **before** the drag started.

```ts
interface Rect { top: number; height: number }

arrayMove<T>(list: readonly T[], from: number, to: number): T[]
getDropIndex(rects: readonly Rect[], activeIndex: number, pointerY: number): number
```

## `arrayMove(list, from, to)`

Return a new array with the item at `from` moved to index `to`, and leave the input unchanged. Both indices must be integers inside the list. Otherwise, throw a `RangeError`.

## `getDropIndex(rects, activeIndex, pointerY)`

Return the index where the dragged item should end up, so that `arrayMove(list, activeIndex, getDropIndex(...))` is the reordered list. The answer is **the number of other items whose vertical midpoint is strictly above `pointerY`**. A pointer exactly on a midpoint doesn't pass it.

The dragged item's own rect is not one of the other items. Rects can have different heights and gaps between them. An invalid `activeIndex` throws a `RangeError`.
