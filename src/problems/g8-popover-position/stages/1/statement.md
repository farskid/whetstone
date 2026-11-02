# Popover positioning

Tooltips, dropdowns and popovers have to sit next to their anchor without spilling off-screen. **Floating UI** does this with a small pipeline. It computes a starting position from a placement such as `'bottom-start'`, then passes it through middleware that nudge it, flip it to the other side, or slide it back into view. Over the stages you'll build that pipeline and five middleware.

Everything uses plain rectangles `{ x, y, width, height }` in the same coordinate space: the reference (anchor), the viewport, and the floating element's size. `y` grows downward.

This stage computes the starting position. There's no middleware yet.

```ts
computePosition(anchor, { width: 80, height: 30 }, { placement: 'bottom-start', viewport });
// { x: anchor.x, y: anchor.y + anchor.height, placement: 'bottom-start', middlewareData: {} }
```

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

## `computePosition(reference, floating, { placement = 'bottom', viewport, rtl = false })`

`floating` is just `{ width, height }`. This returns `{ x, y, placement, middlewareData }`, where `x` and `y` are the floating element's top-left corner for `placement`, and `middlewareData` is `{}`. `viewport` is always passed but isn't used until a later stage.
