// Stage contract (src/runner/contract.ts): checked against your code in TypeScript mode.
import { layout } from './solution';

/**
 * @contract layout, MasonryItem, MasonryOptions.columnCount
 * @change Items can give an `aspectRatio` instead of a `height`, and options can give `minColumnWidth` instead of `columnCount`.
 * Your `layout` doesn't accept `{ aspectRatio }` items or `minColumnWidth` yet. Type the arguments as `MasonryItem[]` and `MasonryOptions` (from `./types`).
 */
export function ratioItems() {
  layout([{ aspectRatio: 1.5 }, { height: 120 }], { containerWidth: 800, minColumnWidth: 200 });
}
