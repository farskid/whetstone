# Sortable drag-and-drop: trees

Add nested lists, where the horizontal drag offset decides how deep the item lands.

```ts
interface TreeItem { id: string; parentId: string | null }
interface TreeDrop { depth: number; parentId: string | null; index: number }

getTreeDrop(items, activeId, insertIndex, offsetX, options?: { indent?: number; maxDepth?: number }): TreeDrop | null
moveNode(items, id, parentId, index): TreeItem[]
isDescendant(items, ancestorId, id): boolean
```

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

Everything from earlier stages still applies.
