# Popover positioning

Tooltips, dropdowns and popovers have to sit next to their anchor without spilling off-screen. **Floating UI** does this with a small pipeline. It computes a starting position from a placement such as `'bottom-start'`, then passes it through middleware that nudge it, flip it to the other side, or slide it back into view. You'll build that pipeline and five middleware.

Everything uses plain rectangles `{ x, y, width, height }` in the same coordinate space: the reference (anchor), the viewport, and the floating element's size. `y` grows downward.

## Placements

A placement is a side, optionally with an alignment: `'top' | 'right' | 'bottom' | 'left'`, plus `-start` or `-end`. That makes 12 placements.

**Main axis.** The floating element sits **outside** the reference on that side:

- for `top`, its bottom edge touches the reference's top edge;
- for `right`, its left edge touches the reference's right edge.

**Cross axis:**

- **No alignment.** The floating element is centred on the reference.
- **`start`.** It lines up with the reference's left edge for `top` and `bottom`, or its top edge for `left` and `right`.
- **`end`.** It lines up with the opposite edge.
- **RTL.** With `rtl: true`, `start` and `end` swap for `top` and `bottom` only.

`getSide` and `getAlignment` are provided.

## `computePosition(reference, floating, { placement = 'bottom', middleware = [], viewport, rtl = false })`

This works out the coordinates for `placement`, then runs each middleware's `fn(state)` in order. `state` has these fields:

```ts
{ x, y, placement, initialPlacement, rects: { reference, floating }, viewport, rtl, middlewareData }
```

`rects.floating` is `{ x: 0, y: 0, width, height }`. A middleware may return `{ x?, y?, data?, reset? }`:

- **`x` and `y`** replace the current coordinates. The next middleware sees them.
- **`data`** is shallow-merged into `middlewareData[name]`. Every middleware that ran gets an entry, even an empty one.
- **`reset: true` or `reset: { placement }`** changes the placement if one is given. It then works out the coordinates again and **restarts the pipeline from the first middleware**. `middlewareData` is kept across restarts.

**Resets are capped.** After 50 resets, further `reset`s are ignored and the pipeline just continues.

The result is `{ x, y, placement, middlewareData }`.

## `detectOverflow(state, { padding = 0 })`

This returns how far the floating element, at `state.x`/`state.y`, sticks out past each edge of the viewport, as `{ top, right, bottom, left }`. Positive means overflowing, and negative means there's room to spare. `padding` shrinks the viewport on every side.

## Middleware

Each factory returns `{ name, fn }`. The name is the factory's own name.

### `offset(n | { mainAxis = 0, crossAxis = 0 })`

- **`mainAxis`** pushes the floating element away from the reference. A plain number means `mainAxis`.
- **`crossAxis`** moves it along the other axis, right or down. For `top` and `bottom` in RTL, it moves left.
- **Data:** `{ x, y }`, the amount actually moved.

### `flip({ padding = 0, fallbackPlacements? })`

The candidates are `[initialPlacement, ...fallbackPlacements]`. By default `fallbackPlacements` is the opposite side with the same alignment, so `bottom-start` falls back to `top-start`.

For each candidate in turn:

1. **Check it.** Measure the overflow on the current placement's **own side** (`detectOverflow(...)[side]`). If it's `<= 0`, the placement fits and `flip` returns nothing.
2. **Record it.** Otherwise add `{ placement, overflow }` to `data.overflows`.
3. **Try the next one.** Reset to the next candidate.
4. **Best fit.** If no candidate fits, end on the candidate with the smallest recorded overflow. On a tie, take the earliest. If that means switching placement, reset to it once. Either way, `flip` must stop resetting.

### `shift({ padding = 0 })`

This slides the floating element along the cross axis so it stays inside the viewport, shrunk by `padding`. That's `x` for `top` and `bottom`, and `y` for `left` and `right`. If the element is too big to fit, it lines up with the start edge (left or top). The data is `{ x, y }`, the amount shifted.

### `arrow({ size, padding = 0 })`

This positions an arrow of `size` px along the floating element's cross axis, pointing at the centre of the reference. The position is measured from the floating element's left edge (or top edge for `left` and `right`):

- The arrow's centre should line up with the reference's centre.
- It's clamped to `[padding, length − size − padding]`.
- The data is `{ x }` (or `{ y }`) and `centerOffset`, which is how far the clamp moved it, as `ideal − clamped`.

Run it after `shift`.

### `autoPlacement({ alignment?, allowedSides = ['top', 'right', 'bottom', 'left'] })`

This picks the allowed side with the most room between the reference and that edge of the viewport. On a tie, take the earliest in `allowedSides`. It adds the alignment if one is given. If that's not the current placement, it resets to it.
