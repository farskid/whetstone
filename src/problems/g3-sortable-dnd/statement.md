# Sortable drag-and-drop

Libraries like **dnd-kit** keep the DOM work separate from a small amount of pure math, and the math is what you'll build here. Rects are plain `{ top, height }` objects measured **before** the drag started.

## Stage 1: `arrayMove(list, from, to)`

Return a new array with the item at `from` moved to index `to`, and leave the input unchanged. Both indices must be integers inside the list. Otherwise, throw a `RangeError`.

## Stage 2: `getDropIndex(rects, activeIndex, pointerY)`

Return the index where the dragged item should end up, so that `arrayMove(list, activeIndex, getDropIndex(...))` is the reordered list. The answer is **the number of other items whose vertical midpoint is strictly above `pointerY`**. A pointer exactly on a midpoint doesn't pass it.

The dragged item's own rect is not one of the other items. Rects can have different heights and gaps between them. An invalid `activeIndex` throws a `RangeError`.

## Stage 3: several selected items

- **`moveMany(list, selected, toIndex)`** moves the items at the `selected` indices as one block:
  1. Take the selected items out, keeping their **original relative order**. The order of `selected` doesn't matter, and duplicate indices count once.
  2. Insert the block at `toIndex` of the remaining list, where `0 ≤ toIndex ≤ remaining.length`.
- **`getDropIndexMany(rects, selected, pointerY)`** returns the `toIndex` for a pointer position. It works like `getDropIndex`, but excludes every selected item.

An out-of-range index throws a `RangeError`.

## Stage 4: trees

A tree is a flat list of `{ id, parentId }` items in **preorder**: every parent comes before its children, and each subtree is contiguous. The root items have `parentId: null` and depth 0.

### `getTreeDrop(items, activeId, insertIndex, offsetX, { indent = 20, maxDepth = Infinity })`

Picture the list with the active item **and its whole subtree** removed. `insertIndex` (from `0` to that list's length) is where the subtree is being inserted. Let `prev` and `next` be the items just before and just after that gap.

1. **Projected depth.** `activeDepth + Math.round(offsetX / indent)`. Dragging right by one indent nests the item one level deeper.
2. **Clamp.** The depth can be at most `prev.depth + 1`, or `0` when there is no `prev`. It must be at least `next.depth`, or `0` when there is no `next`, so that `next` keeps its parent.
3. **Max depth.** If the subtree is `h` levels deep below the active item, the active item's depth can be at most `maxDepth - h`. If no depth satisfies every bound, return `null`.
4. **Result.** Return `{ depth, parentId, index }`:
   - `parentId` is the nearest item before the gap at `depth - 1`, or `null` for depth 0.
   - `index` is the number of that parent's children before the gap.

Unknown ids throw. An out-of-range `insertIndex` throws a `RangeError`.

### `moveNode(items, id, parentId, index)`

Return a new preorder list with the subtree of `id` moved so that it becomes child number `index` of `parentId`. Use `null` for the root level. Only the moved item's `parentId` changes, and the input is not mutated. `index` may be at most the number of the new parent's children, not counting the moved node.

**Throw** if `parentId` is `id` itself or one of its descendants. A node can't be dropped inside itself.

### `isDescendant(items, ancestorId, id)`

Returns whether `id` is strictly below `ancestorId`.

Taken together, applying `moveNode(items, activeId, drop.parentId, drop.index)` for any non-null `drop` puts the subtree exactly at `insertIndex` of the reduced list.
